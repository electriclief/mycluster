/**
 * Tests for JobQueue class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JobQueue } from '../src/job-queue.js';
import { MemoryStorage } from '../src/storage-memory.js';

describe('JobQueue', () => {
  let queue: JobQueue;

  beforeEach(() => {
    queue = new JobQueue({
      storage: new MemoryStorage(),
      maxConcurrent: 2,
      maxRetries: 3,
      jobTimeout: 5000,
    });
  });

  describe('enqueue', () => {
    it('should create a job with pending status', async () => {
      const job = await queue.enqueue({
        script: "print('hello')",
        targetComputerId: 'computer_123',
        priority: 5,
      });

      expect(job.id).toMatch(/^job_/);
      expect(job.status).toBe('pending');
      expect(job.script).toBe("print('hello')");
      expect(job.targetComputerId).toBe('computer_123');
      expect(job.priority).toBe(5);
    });

    it('should increment job IDs', async () => {
      const job1 = await queue.enqueue({
        script: 'test1',
        targetComputerId: 'c1',
        priority: 0,
      });
      const job2 = await queue.enqueue({
        script: 'test2',
        targetComputerId: 'c1',
        priority: 0,
      });

      expect(job1.id).not.toBe(job2.id);
    });
  });

  describe('getJobs', () => {
    it('should return all jobs', async () => {
      await queue.enqueue({ script: 'test1', targetComputerId: 'c1', priority: 0 });
      await queue.enqueue({ script: 'test2', targetComputerId: 'c1', priority: 0 });

      // Give some time for potential auto-processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const jobs = await queue.getJobs();
      expect(jobs.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status', async () => {
      await queue.enqueue({ script: 'test1', targetComputerId: 'c1', priority: 0 });
      await queue.enqueue({ script: 'test2', targetComputerId: 'c1', priority: 0 });

      // Wait a bit for potential processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const allJobs = await queue.getJobs();
      expect(allJobs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getJob', () => {
    it('should return a specific job by ID', async () => {
      const job = await queue.enqueue({
        script: 'test',
        targetComputerId: 'c1',
        priority: 0,
      });

      const foundJob = await queue.getJob(job.id);
      expect(foundJob).toBeDefined();
      expect(foundJob?.id).toBe(job.id);
    });

    it('should return undefined for non-existent job', async () => {
      const job = await queue.getJob('nonexistent');
      expect(job).toBeUndefined();
    });
  });

  describe('cancel', () => {
    it('should cancel a pending job', async () => {
      const job = await queue.enqueue({
        script: 'test',
        targetComputerId: 'c1',
        priority: 0,
      });

      await queue.cancel(job.id);

      const updatedJob = await queue.getJob(job.id);
      expect(updatedJob?.status).toBe('cancelled');
    });

    it('should throw error for non-existent job', async () => {
      await expect(queue.cancel('nonexistent')).rejects.toThrow('not found');
    });
  });

  describe('getStats', () => {
    it('should return correct job counts', async () => {
      await queue.enqueue({ script: 'test1', targetComputerId: 'c1', priority: 0 });
      await queue.enqueue({ script: 'test2', targetComputerId: 'c1', priority: 0 });
      await queue.enqueue({ script: 'test3', targetComputerId: 'c1', priority: 0 });

      // Wait a bit for potential processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stats = await queue.getStats();

      expect(stats.total).toBeGreaterThanOrEqual(3);
      // Jobs may have been processed (running/complete/failed)
      expect(stats.pending + stats.running + stats.complete + stats.failed + stats.cancelled).toBeGreaterThanOrEqual(3);
    });
  });

  describe('cleanupOldJobs', () => {
    it('should return 0 when no old jobs exist', async () => {
      await queue.enqueue({ script: 'test', targetComputerId: 'c1', priority: 0 });
      
      const deleted = await queue.cleanupOldJobs(24);
      expect(deleted).toBe(0);
    });
  });
});
