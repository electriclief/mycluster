/**
 * Integration Tests: Job Queue + Storage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JobQueue } from '@mycluster/core';
import { MemoryStorage } from '@mycluster/core';

describe('JobQueue Integration', () => {
  let jobQueue: JobQueue;
  let storage: MemoryStorage;

  beforeEach(async () => {
    storage = new MemoryStorage();
    jobQueue = new JobQueue({
      storage,
      maxConcurrent: 2,
      maxRetries: 3,
      jobTimeout: 30000,
    });
  });

  it('should enqueue and execute jobs', async () => {
    const jobId = 'test-job-1';
    const job = await jobQueue.enqueue({
      id: jobId,
      script: 'print("test")',
      targetComputerId: 'test-computer',
      priority: 5,
      args: {},
    });
    expect(job.id).toBe(jobId);
    const retrievedJob = await jobQueue.getJob(jobId);
    expect(retrievedJob?.id).toBe(jobId);
  });

  it('should handle job cancellation', async () => {
    const jobId = 'test-job-cancel';
    await jobQueue.enqueue({
      id: jobId,
      script: 'print("cancelled")',
      targetComputerId: 'test-computer',
      priority: 5,
      args: {},
    });
    await jobQueue.cancel(jobId);
    const job = await jobQueue.getJob(jobId);
    expect(job?.status).toBe('cancelled');
  });

  it('should respect job priority', async () => {
    await jobQueue.enqueue({ id: 'low', script: 'print("low")', targetComputerId: 'c', priority: 1, args: {} });
    await jobQueue.enqueue({ id: 'high', script: 'print("high")', targetComputerId: 'c', priority: 10, args: {} });
    const pendingJobs = await jobQueue.getJobs('pending');
    expect(pendingJobs[0].priority).toBe(10);
  });

  it('should persist jobs to storage', async () => {
    const jobId = 'persist-test';
    await jobQueue.enqueue({ id: jobId, script: 'print("persisted")', targetComputerId: 'c', priority: 5, args: {} });
    const newQueue = new JobQueue({ storage });
    const job = await newQueue.getJob(jobId);
    expect(job?.id).toBe(jobId);
  });
});
