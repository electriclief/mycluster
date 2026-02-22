/**
 * Performance Benchmark: Job Queue
 * 
 * Tests job queue performance under load.
 * 
 * Usage: npm run test:benchmark
 */

import { JobQueue } from '@mycluster/core';
import { MemoryStorage } from '@mycluster/core';

interface BenchmarkResult {
  name: string;
  duration: number;
  opsPerSecond: number;
  totalJobs: number;
}

async function runBenchmark(): Promise<void> {
  console.log('🚀 Starting Job Queue Performance Benchmark\n');
  
  const results: BenchmarkResult[] = [];
  const storage = new MemoryStorage();
  const jobQueue = new JobQueue({
    storage,
    maxConcurrent: 10,
    maxRetries: 0,
    jobTimeout: 30000,
  });

  // Benchmark 1: Enqueue 100 jobs
  console.log('📊 Benchmark 1: Enqueue 100 jobs');
  let start = Date.now();
  for (let i = 0; i < 100; i++) {
    await jobQueue.enqueue({
      id: `bench1-job-${i}`,
      script: `print("job ${i}")`,
      targetComputerId: 'test-computer',
      priority: Math.floor(Math.random() * 10),
      args: {},
    });
  }
  let duration = Date.now() - start;
  results.push({
    name: 'Enqueue 100 jobs',
    duration,
    opsPerSecond: Math.round(100 / (duration / 1000)),
    totalJobs: 100,
  });
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Ops/sec: ${results[0].opsPerSecond}\n`);

  // Benchmark 2: Get jobs (all)
  console.log('📊 Benchmark 2: Get all jobs (100)');
  start = Date.now();
  const iterations = 100;
  for (let i = 0; i < iterations; i++) {
    await jobQueue.getJobs();
  }
  duration = Date.now() - start;
  results.push({
    name: `Get all jobs (${iterations} iterations)`,
    duration,
    opsPerSecond: Math.round(iterations / (duration / 1000)),
    totalJobs: 100,
  });
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Ops/sec: ${results[1].opsPerSecond}\n`);

  // Benchmark 3: Get jobs by status
  console.log('📊 Benchmark 3: Get jobs by status (pending)');
  start = Date.now();
  for (let i = 0; i < iterations; i++) {
    await jobQueue.getJobs('pending');
  }
  duration = Date.now() - start;
  results.push({
    name: `Get jobs by status (${iterations} iterations)`,
    duration,
    opsPerSecond: Math.round(iterations / (duration / 1000)),
    totalJobs: 100,
  });
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Ops/sec: ${results[2].opsPerSecond}\n`);

  // Benchmark 4: Get individual jobs
  console.log('📊 Benchmark 4: Get individual jobs (50)');
  start = Date.now();
  for (let i = 0; i < 50; i++) {
    await jobQueue.getJob(`bench1-job-${i}`);
  }
  duration = Date.now() - start;
  results.push({
    name: 'Get individual jobs (50)',
    duration,
    opsPerSecond: Math.round(50 / (duration / 1000)),
    totalJobs: 50,
  });
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Ops/sec: ${results[3].opsPerSecond}\n`);

  // Benchmark 5: Get stats
  console.log('📊 Benchmark 5: Get stats (100 iterations)');
  start = Date.now();
  for (let i = 0; i < iterations; i++) {
    await jobQueue.getStats();
  }
  duration = Date.now() - start;
  results.push({
    name: `Get stats (${iterations} iterations)`,
    duration,
    opsPerSecond: Math.round(iterations / (duration / 1000)),
    totalJobs: iterations,
  });
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Ops/sec: ${results[4].opsPerSecond}\n`);

  // Benchmark 6: Cancel jobs
  console.log('📊 Benchmark 6: Cancel 50 jobs');
  start = Date.now();
  for (let i = 0; i < 50; i++) {
    await jobQueue.cancel(`bench1-job-${i}`);
  }
  duration = Date.now() - start;
  results.push({
    name: 'Cancel 50 jobs',
    duration,
    opsPerSecond: Math.round(50 / (duration / 1000)),
    totalJobs: 50,
  });
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Ops/sec: ${results[5].opsPerSecond}\n`);

  // Summary
  console.log('═══════════════════════════════════════════');
  console.log('📈 BENCHMARK SUMMARY');
  console.log('═══════════════════════════════════════════');
  
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const totalOps = results.reduce((sum, r) => sum + r.opsPerSecond, 0);
  
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Average Ops/sec: ${Math.round(totalOps / results.length)}`);
  console.log('═══════════════════════════════════════════\n');

  // Performance thresholds (fail if too slow)
  const enqueueThreshold = 1000; // Should enqueue 100 jobs in < 1s
  if (results[0].duration > enqueueThreshold) {
    console.error(`❌ FAIL: Enqueue too slow (${results[0].duration}ms > ${enqueueThreshold}ms)`);
    process.exit(1);
  }
  
  console.log('✅ All benchmarks passed!');
}

runBenchmark().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
