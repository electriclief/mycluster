/**
 * Agent API Routes
 * Handles communication between MyCluster agents and the server
 */

import { Router, Request, Response } from 'express';

interface AgentInfo {
  agentId: string;
  agentName: string;
  hostname: string;
  platform: string;
  pythonVersion: string;
  registeredAt: string;
  lastHeartbeat: string;
  activeJobs: number;
  status: 'online' | 'offline';
}

interface Job {
  id: string;
  script: string;
  targetComputerId: string;
  args?: Record<string, unknown>;
  priority: number;
  timeout?: number;
}

interface JobResult {
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

export class AgentAPI {
  private router: Router;
  private agents: Map<string, AgentInfo> = new Map();
  private jobQueue: Array<Job & { status: 'pending' | 'assigned' | 'completed' }> = [];
  private jobResults: Map<string, { result: JobResult; completedAt: string }> = new Map();

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Agent registration
    this.router.post('/register', (req, res) => this.registerAgent(req, res));
    this.router.post('/deregister', (req, res) => this.deregisterAgent(req, res));
    this.router.post('/heartbeat', (req, res) => this.heartbeat(req, res));

    // Job polling
    this.router.get('/jobs', (req, res) => this.getAvailableJobs(req, res));
    this.router.post('/jobs/:jobId/result', (req, res) => this.submitJobResult(req, res));

    // Agent status
    this.router.get('/agents', (req, res) => this.listAgents(req, res));
    this.router.get('/agents/:agentId', (req, res) => this.getAgent(req, res));
  }

  /**
   * Register a new agent
   */
  private registerAgent(req: Request, res: Response): void {
    const { agentId, agentName, hostname, platform, pythonVersion } = req.body;

    const agent: AgentInfo = {
      agentId,
      agentName,
      hostname,
      platform,
      pythonVersion,
      registeredAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      activeJobs: 0,
      status: 'online',
    };

    this.agents.set(agentId, agent);
    console.log(`🤖 Agent registered: ${agentName} (${agentId})`);

    res.json({ success: true, agentId });
  }

  /**
   * Deregister an agent
   */
  private deregisterAgent(req: Request, res: Response): void {
    const { agentId } = req.body;
    this.agents.delete(agentId);
    console.log(`🤖 Agent deregistered: ${agentId}`);
    res.json({ success: true });
  }

  /**
   * Handle agent heartbeat
   */
  private heartbeat(req: Request, res: Response): void {
    const { agentId, activeJobs } = req.body;
    const agent = this.agents.get(agentId);

    if (agent) {
      agent.lastHeartbeat = new Date().toISOString();
      agent.activeJobs = activeJobs || 0;
      agent.status = 'online';
    }

    res.json({ success: true });
  }

  /**
   * Get available jobs for agent
   */
  private getAvailableJobs(req: Request, res: Response): void {
    const limitParam = req.query.limit as string || '5';
    const maxJobs = parseInt(limitParam, 10);

    // Get pending jobs
    const availableJobs = this.jobQueue
      .filter(job => job.status === 'pending')
      .slice(0, maxJobs);

    // Mark as assigned
    availableJobs.forEach(job => {
      job.status = 'assigned';
    });

    res.json(availableJobs);
  }

  /**
   * Submit job result
   */
  private submitJobResult(req: Request, res: Response): void {
    const jobId = req.params.jobId as string;
    const { agentId, result } = req.body as { agentId: string; result: JobResult };

    // Store result
    this.jobResults.set(jobId, {
      result,
      completedAt: new Date().toISOString(),
    });

    // Update job status in queue
    const jobIndex = this.jobQueue.findIndex(j => j.id === jobId);
    if (jobIndex !== -1) {
      this.jobQueue.splice(jobIndex, 1);
    }

    console.log(`✅ Job result received: ${jobId} (exit code: ${result.exitCode})`);

    res.json({ success: true });
  }

  /**
   * List all agents
   */
  private listAgents(req: Request, res: Response): void {
    const agents = Array.from(this.agents.values());
    
    // Mark agents as offline if no heartbeat in 60 seconds
    const now = Date.now();
    agents.forEach(agent => {
      const lastHeartbeat = new Date(agent.lastHeartbeat).getTime();
      if (now - lastHeartbeat > 60000) {
        agent.status = 'offline';
      }
    });

    res.json(agents);
  }

  /**
   * Get single agent info
   */
  private getAgent(req: Request, res: Response): void {
    const agentId = req.params.agentId as string;
    const agent = this.agents.get(agentId);

    if (agent) {
      res.json(agent);
    } else {
      res.status(404).json({ error: 'Agent not found' });
    }
  }

  /**
   * Add a job to the queue (called from JobQueue)
   */
  public addJobToQueue(job: Job): void {
    this.jobQueue.push({
      ...job,
      status: 'pending',
    });
  }

  /**
   * Get job result
   */
  public getJobResult(jobId: string): { result: JobResult; completedAt: string } | undefined {
    return this.jobResults.get(jobId);
  }

  /**
   * Get router for Express
   */
  public getRouter(): Router {
    return this.router;
  }

  /**
   * Get stats
   */
  public getStats(): { totalAgents: number; onlineAgents: number; queuedJobs: number; completedJobs: number } {
    const agents = Array.from(this.agents.values());
    return {
      totalAgents: agents.length,
      onlineAgents: agents.filter(a => a.status === 'online').length,
      queuedJobs: this.jobQueue.filter(j => j.status === 'pending').length,
      completedJobs: this.jobResults.size,
    };
  }
}
