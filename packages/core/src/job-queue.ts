/**
 * Job Queue - Manages batch processing jobs
 */
import { Job, JobStatus, StorageProvider } from './types.js';

export interface JobQueueOptions {
  storage: StorageProvider;
  maxConcurrent?: number;
  maxRetries?: number;
  jobTimeout?: number;
}

export type JobProgress = {
  jobId: string;
  status: JobStatus;
  progress?: number;
  message?: string;
  output?: string;
};

export type JobListener = (progress: JobProgress) => void;

export class JobQueue {
  private storage: StorageProvider;
  private maxConcurrent: number;
  private maxRetries: number;
  private jobTimeout: number;
  private runningJobs: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Set<JobListener> = new Set();
  private isProcessing: boolean = false;

  constructor(options: JobQueueOptions) {
    this.storage = options.storage;
    this.maxConcurrent = options.maxConcurrent ?? 3;
    this.maxRetries = options.maxRetries ?? 3;
    this.jobTimeout = options.jobTimeout ?? 300000; // 5 minutes default
  }

  /**
   * Add a listener for job progress updates
   */
  onProgress(listener: JobListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of job progress
   */
  private notifyListeners(progress: JobProgress): void {
    this.listeners.forEach(listener => listener(progress));
  }

  /**
   * Create and enqueue a new job
   */
  async enqueue(job: Omit<Job, 'id' | 'status' | 'createdAt'>): Promise<Job> {
    const newJob: Job = {
      ...job,
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      priority: job.priority ?? 0,
    };

    await this.storage.saveJob(newJob);
    this.notifyListeners({ jobId: newJob.id, status: 'pending' });
    
    // Trigger processing if not already running
    this.processQueue();

    return newJob;
  }

  /**
   * Get a job by ID
   */
  async getJob(id: string): Promise<Job | undefined> {
    const jobs = await this.storage.getJobs();
    return jobs.find(j => j.id === id);
  }

  /**
   * Get all jobs with optional status filter
   */
  async getJobs(status?: JobStatus): Promise<Job[]> {
    const jobs = await this.storage.getJobs();
    if (status) {
      return jobs.filter(j => j.status === status);
    }
    return jobs;
  }

  /**
   * Cancel a job
   */
  async cancel(id: string): Promise<void> {
    const job = await this.getJob(id);
    if (!job) {
      throw new Error(`Job ${id} not found`);
    }

    if (job.status === 'running') {
      // Clear timeout if running
      const timeout = this.runningJobs.get(id);
      if (timeout) {
        clearTimeout(timeout);
        this.runningJobs.delete(id);
      }
    }

    await this.storage.updateJob(id, { status: 'cancelled' });
    this.notifyListeners({ jobId: id, status: 'cancelled' });
  }

  /**
   * Update job status
   */
  async updateStatus(id: string, status: JobStatus, result?: Job['result']): Promise<void> {
    const updates: Partial<Job> = { status };
    
    if (status === 'running') {
      updates.startedAt = new Date().toISOString();
    } else if (status === 'complete' || status === 'failed') {
      updates.completedAt = new Date().toISOString();
      if (result) {
        updates.result = result;
      }
    }

    await this.storage.updateJob(id, updates);
    this.notifyListeners({ jobId: id, status, output: result?.error || result?.data });
  }

  /**
   * Process the job queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const jobs = await this.getJobs();
      const runningCount = jobs.filter(j => j.status === 'running').length;
      const availableSlots = this.maxConcurrent - runningCount;

      if (availableSlots <= 0) {
        this.isProcessing = false;
        return;
      }

      // Get pending jobs sorted by priority
      const pendingJobs = jobs
        .filter(j => j.status === 'pending')
        .sort((a, b) => b.priority - a.priority)
        .slice(0, availableSlots);

      for (const job of pendingJobs) {
        this.executeJob(job);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single job
   */
  private async executeJob(job: Job): Promise<void> {
    try {
      // Update to running
      await this.updateStatus(job.id, 'running');
      this.notifyListeners({ jobId: job.id, status: 'running', message: 'Starting execution...' });

      // Set timeout
      const timeout = setTimeout(async () => {
        await this.updateStatus(job.id, 'failed', {
          type: 'text',
          error: `Job timed out after ${this.jobTimeout}ms`,
          exitCode: -1,
        });
        this.runningJobs.delete(job.id);
        this.processQueue();
      }, this.jobTimeout);

      this.runningJobs.set(job.id, timeout);

      // Note: Actual job execution will be handled by the Agent system in Phase R3
      // For now, we simulate completion for testing
      await this.simulateJobExecution(job);

      // Clear timeout
      clearTimeout(timeout);
      this.runningJobs.delete(job.id);

      // Mark as complete
      await this.updateStatus(job.id, 'complete', {
        type: 'text',
        data: 'Job completed successfully (simulated)',
        exitCode: 0,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Retry logic
      const retryCount = (job.result?.exitCode === -2 ? 0 : job.result?.exitCode) || 0;
      if (retryCount < this.maxRetries) {
        await this.storage.updateJob(job.id, {
          status: 'pending',
          result: { type: 'text', exitCode: -2, error: 'Retry scheduled' },
        });
        this.notifyListeners({ jobId: job.id, status: 'pending', message: `Retry ${retryCount + 1}/${this.maxRetries}` });
        this.processQueue();
      } else {
        await this.updateStatus(job.id, 'failed', {
          type: 'text',
          error: errorMessage,
          exitCode: -1,
        });
      }
    }

    // Process next jobs
    setTimeout(() => this.processQueue(), 100);
  }

  /**
   * Simulate job execution (placeholder for Phase R3 Agent integration)
   */
  private async simulateJobExecution(job: Job): Promise<void> {
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.1) {
      throw new Error('Simulated random failure');
    }
  }

  /**
   * Clean up old completed jobs
   */
  async cleanupOldJobs(maxAgeHours: number = 24): Promise<number> {
    const jobs = await this.getJobs();
    const cutoff = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    let deleted = 0;

    for (const job of jobs) {
      if ((job.status === 'complete' || job.status === 'failed' || job.status === 'cancelled') 
          && job.completedAt) {
        const completedTime = new Date(job.completedAt).getTime();
        if (completedTime < cutoff) {
          await this.storage.deleteJob(job.id);
          deleted++;
        }
      }
    }

    return deleted;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    running: number;
    complete: number;
    failed: number;
    cancelled: number;
  }> {
    const jobs = await this.getJobs();
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      running: jobs.filter(j => j.status === 'running').length,
      complete: jobs.filter(j => j.status === 'complete').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      cancelled: jobs.filter(j => j.status === 'cancelled').length,
    };
  }
}
