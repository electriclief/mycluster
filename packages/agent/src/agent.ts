/**
 * MyCluster Agent - Remote Job Executor
 * 
 * Connects to a MyCluster server, polls for jobs, executes Python scripts,
 * and returns results.
 */

import { Command } from 'commander';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface AgentConfig {
  serverUrl: string;
  agentId: string;
  agentName: string;
  pollInterval: number;
  maxConcurrentJobs: number;
  pythonPath: string;
  workspaceDir: string;
}

export interface Job {
  id: string;
  script: string;
  targetComputerId: string;
  args?: Record<string, unknown>;
  priority: number;
  timeout?: number;
}

export interface JobResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  files: Array<{
    path: string;
    type: string;
    size: number;
    content?: string;
    preview_base64?: string;
  }>;
  duration_ms: number;
  error?: string;
}

class Agent {
  private config: AgentConfig;
  private isRunning: boolean = false;
  private activeJobs: Set<string> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<AgentConfig>) {
    this.config = {
      serverUrl: config.serverUrl || 'http://localhost:3000',
      agentId: config.agentId || this.generateAgentId(),
      agentName: config.agentName || os.hostname(),
      pollInterval: config.pollInterval || 5000,
      maxConcurrentJobs: config.maxConcurrentJobs || 2,
      pythonPath: config.pythonPath || 'python',
      workspaceDir: config.workspaceDir || path.join(os.tmpdir(), 'mycluster-agent'),
    };

    // Ensure workspace directory exists
    if (!fs.existsSync(this.config.workspaceDir)) {
      fs.mkdirSync(this.config.workspaceDir, { recursive: true });
    }
  }

  private generateAgentId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start the agent
   */
  async start(): Promise<void> {
    console.log(`🚀 Starting MyCluster Agent`);
    console.log(`   Agent ID: ${this.config.agentId}`);
    console.log(`   Agent Name: ${this.config.agentName}`);
    console.log(`   Server: ${this.config.serverUrl}`);
    console.log(`   Workspace: ${this.config.workspaceDir}`);

    this.isRunning = true;

    // Register with server
    await this.register();

    // Start heartbeat
    this.startHeartbeat();

    // Start polling for jobs
    this.startPolling();

    console.log(`✅ Agent started. Polling for jobs every ${this.config.pollInterval}ms`);
  }

  /**
   * Stop the agent
   */
  async stop(): Promise<void> {
    console.log('\n🛑 Stopping agent...');
    this.isRunning = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    // Wait for active jobs to complete
    if (this.activeJobs.size > 0) {
      console.log(`   Waiting for ${this.activeJobs.size} active job(s) to complete...`);
    }

    // Deregister from server
    await this.deregister();

    console.log('✅ Agent stopped');
  }

  /**
   * Register agent with server
   */
  private async register(): Promise<void> {
    try {
      const response = await fetch(`${this.config.serverUrl}/api/agent/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: this.config.agentId,
          agentName: this.config.agentName,
          hostname: os.hostname(),
          platform: os.platform(),
          pythonVersion: await this.getPythonVersion(),
        }),
      });

      if (response.ok) {
        console.log('✅ Registered with server');
      } else {
        console.warn('⚠️  Server registration failed, continuing anyway');
      }
    } catch (error) {
      console.warn('⚠️  Could not connect to server:', (error as Error).message);
    }
  }

  /**
   * Deregister agent from server
   */
  private async deregister(): Promise<void> {
    try {
      await fetch(`${this.config.serverUrl}/api/agent/deregister`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: this.config.agentId }),
      });
    } catch (error) {
      // Ignore errors during shutdown
    }
  }

  /**
   * Send heartbeat to server
   */
  private startHeartbeat(): void {
    const sendHeartbeat = async () => {
      try {
        await fetch(`${this.config.serverUrl}/api/agent/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: this.config.agentId,
            activeJobs: this.activeJobs.size,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (error) {
        // Ignore heartbeat errors
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(sendHeartbeat, 30000);
  }

  /**
   * Poll server for jobs
   */
  private startPolling(): void {
    const pollJobs = async () => {
      if (!this.isRunning) return;

      // Check if we can accept more jobs
      if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
        return;
      }

      try {
        const response = await fetch(
          `${this.config.serverUrl}/api/agent/jobs?agentId=${this.config.agentId}&limit=${this.config.maxConcurrentJobs - this.activeJobs.size}`,
          { method: 'GET' }
        );

        if (response.ok) {
          const jobs = (await response.json()) as Job[];
          
          for (const job of jobs) {
            if (this.activeJobs.size < this.config.maxConcurrentJobs) {
              this.executeJob(job);
            }
          }
        }
      } catch (error) {
        // Ignore poll errors, will retry next interval
      }
    };

    // Poll immediately
    pollJobs();

    // Poll at configured interval
    this.pollInterval = setInterval(pollJobs, this.config.pollInterval);
  }

  /**
   * Execute a job
   */
  private async executeJob(job: Job): Promise<void> {
    console.log(`\n📋 Executing job ${job.id}`);
    this.activeJobs.add(job.id);

    const jobDir = path.join(this.config.workspaceDir, job.id);
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }

    try {
      // Find runner.py
      const runnerPath = path.join(__dirname, 'runner.py');

      // Execute Python script
      const result = await this.runPythonScript(
        runnerPath,
        ['--script', job.script, '--output-dir', jobDir, '--output-json'],
        job.timeout
      );

      // Report result to server
      await this.reportResult(job.id, result);

      console.log(`✅ Job ${job.id} completed (exit code: ${result.exitCode}, duration: ${result.duration_ms}ms)`);
    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, (error as Error).message);
      
      await this.reportResult(job.id, {
        stdout: '',
        stderr: (error as Error).message,
        exitCode: -1,
        files: [],
        duration_ms: 0,
        error: (error as Error).message,
      });
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Run Python script and capture output
   */
  private async runPythonScript(
    scriptPath: string,
    args: string[],
    timeout?: number
  ): Promise<JobResult> {
    return new Promise((resolve, reject) => {
      const pythonArgs = [scriptPath, ...args];
      const proc = spawn(this.config.pythonPath, pythonArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let startTime = Date.now();

      const timeoutMs = timeout ? timeout * 1000 : 300000; // Default 5 min
      const timeoutTimer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`Script execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timeoutTimer);
        
        try {
          // Try to parse JSON result from stdout
          const result: JobResult = JSON.parse(stdout.trim());
          resolve(result);
        } catch {
          // If not JSON, create result from captured output
          resolve({
            stdout,
            stderr,
            exitCode: code || 0,
            files: [],
            duration_ms: Date.now() - startTime,
          });
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timeoutTimer);
        reject(error);
      });
    });
  }

  /**
   * Report job result to server
   */
  private async reportResult(jobId: string, result: JobResult): Promise<void> {
    try {
      await fetch(`${this.config.serverUrl}/api/agent/jobs/${jobId}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: this.config.agentId,
          jobId,
          result,
        }),
      });
    } catch (error) {
      console.error(`Failed to report result for job ${jobId}:`, (error as Error).message);
    }
  }

  /**
   * Get Python version
   */
  private async getPythonVersion(): Promise<string> {
    return new Promise((resolve) => {
      const proc = spawn(this.config.pythonPath, ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let version = 'unknown';
      proc.stderr.on('data', (data: Buffer) => {
        version = data.toString().trim();
      });

      proc.on('close', () => {
        resolve(version);
      });
    });
  }
}

export { Agent };

// CLI
const program = new Command();

program
  .name('mycluster-agent')
  .description('MyCluster Agent - Remote Job Executor')
  .version('0.1.0')
  .option('-s, --server <url>', 'Server URL', 'http://localhost:3000')
  .option('-n, --name <name>', 'Agent name', os.hostname())
  .option('-i, --poll-interval <ms>', 'Poll interval in milliseconds', '5000')
  .option('-c, --concurrent <num>', 'Max concurrent jobs', '2')
  .option('-p, --python <path>', 'Python executable path', 'python')
  .option('-w, --workspace <dir>', 'Workspace directory')
  .action(async (options) => {
    const agent = new Agent({
      serverUrl: options.server,
      agentName: options.name,
      pollInterval: parseInt(options.pollInterval),
      maxConcurrentJobs: parseInt(options.concurrent),
      pythonPath: options.python,
      workspaceDir: options.workspace,
    });

    // Handle shutdown signals
    process.on('SIGINT', () => agent.stop());
    process.on('SIGTERM', () => agent.stop());

    await agent.start();
  });

program.parse();
