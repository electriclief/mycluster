# E2E Testing Guide

MyCluster uses a comprehensive testing strategy with Playwright for E2E tests and Vitest for integration tests.

## Quick Start

```bash
# Install Playwright browsers
npx playwright install

# Run all E2E tests
npm run test:e2e -w @mycluster/e2e

# Run with UI
npm run test:e2e:ui -w @mycluster/e2e

# Run integration tests
npm run test:integration -w @mycluster/e2e

# Run benchmarks
npm run test:benchmark -w @mycluster/e2e
```

---

## Test Structure

```
packages/e2e/
├── tests/
│   ├── e2e/              # Playwright E2E tests
│   │   ├── job-workflow.spec.ts
│   │   └── dashboard.spec.ts
│   ├── api/              # API integration tests
│   │   └── server-api.test.ts
│   ├── integration/      # Component integration tests
│   │   └── job-queue-integration.test.ts
│   └── benchmark/        # Performance benchmarks
│       └── job-queue.benchmark.ts
├── playwright.config.ts
└── vitest.config.ts
```

---

## E2E Tests (Playwright)

### What They Test

- Complete user workflows in the GUI
- JavaScript execution in real browsers
- Navigation and routing
- WebSocket real-time updates
- Form submissions and interactions

### Running E2E Tests

```bash
# Headless (default)
npm run test:e2e -w @mycluster/e2e

# With browser visible
npm run test:e2e:headed -w @mycluster/e2e

# Debug mode
npm run test:e2e:debug -w @mycluster/e2e

# Specific test file
npm run test:e2e -w @mycluster/e2e -- tests/e2e/job-workflow.spec.ts

# Specific browser
npm run test:e2e -w @mycluster/e2e -- --project=chromium
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should create and monitor a job', async ({ page }) => {
  await page.goto('/jobs');
  
  // Submit job
  await page.locator('textarea').fill("print('hello')");
  await page.click('button:has-text("Submit Job")');
  
  // Wait for job to appear
  await page.waitForSelector('text="pending"');
  
  // Verify stats updated
  const pendingCount = await page.locator('text=Pending').textContent();
  expect(pendingCount).toContain('1');
});
```

---

## API Integration Tests

### What They Test

- REST API endpoints
- Authentication and authorization
- Request/response validation
- Error handling

### Running API Tests

```bash
# Run API tests
npm run test:api -w @mycluster/e2e

# With custom server URL
BASE_URL=http://localhost:8080 npm run test:api -w @mycluster/e2e
```

### API Test Example

```typescript
import { describe, it, expect } from 'vitest';

describe('Jobs API', () => {
  it('should create a job', async () => {
    const response = await fetch('http://localhost:3000/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: 'print("test")',
        targetComputerId: 'test',
      }),
    });
    
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
  });
});
```

---

## Integration Tests

### What They Test

- Component interactions
- Storage provider integration
- Job queue operations
- Service detection

### Running Integration Tests

```bash
npm run test:integration -w @mycluster/e2e
```

### Integration Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { JobQueue, MemoryStorage } from '@mycluster/core';

describe('JobQueue Integration', () => {
  it('should persist jobs to storage', async () => {
    const storage = new MemoryStorage();
    const queue = new JobQueue({ storage });
    
    await queue.enqueue({
      id: 'test-job',
      script: 'print("test")',
      targetComputerId: 'c1',
      priority: 5,
    });
    
    // New queue instance with same storage
    const newQueue = new JobQueue({ storage });
    const job = await newQueue.getJob('test-job');
    expect(job?.id).toBe('test-job');
  });
});
```

---

## Performance Benchmarks

### What They Measure

- Job enqueue/dequeue throughput
- API response times
- Storage operation performance
- Concurrent job handling

### Running Benchmarks

```bash
npm run test:benchmark -w @mycluster/e2e
```

### Benchmark Output

```
🚀 Starting Job Queue Performance Benchmark

📊 Benchmark 1: Enqueue 100 jobs
   Duration: 45ms
   Ops/sec: 2222

📊 Benchmark 2: Get all jobs (100 iterations)
   Duration: 120ms
   Ops/sec: 833

═══════════════════════════════════════════
📈 BENCHMARK SUMMARY
═══════════════════════════════════════════
Total Duration: 450ms
Average Ops/sec: 1500
✅ All benchmarks passed!
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Build packages
        run: npm run build
      
      - name: Run integration tests
        run: npm run test:integration -w @mycluster/e2e
      
      - name: Run E2E tests
        run: npm run test:e2e -w @mycluster/e2e
      
      - name: Run benchmarks
        run: npm run test:benchmark -w @mycluster/e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: packages/e2e/playwright-report/
```

---

## Test Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | http://localhost:3000 | Server URL for API tests |
| `CI` | false | CI mode (more retries, fewer workers) |
| `DEBUG` | - | Debug output |

---

## Writing Tests

### Best Practices

1. **Use descriptive test names**: `should create job with high priority`
2. **Test user workflows**: Simulate real user interactions
3. **Clean up after tests**: Delete test data
4. **Use fixtures**: Reusable test data setup
5. **Test error states**: Verify error handling
6. **Set timeouts**: Prevent hanging tests

### Test Structure

```typescript
// E2E Test
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/path');
    
    // Act
    await page.click('button');
    
    // Assert
    await expect(page.locator('result')).toBeVisible();
  });
});

// Integration Test
import { describe, it, expect } from 'vitest';

describe('Component', () => {
  it('should work correctly', async () => {
    // Arrange
    const component = createComponent();
    
    // Act
    const result = await component.execute();
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

---

## Troubleshooting

### Tests Fail Randomly

- Increase timeouts: `test.setTimeout(30000)`
- Add explicit waits: `await page.waitForSelector(...)`
- Run in debug mode: `npm run test:e2e:debug`

### Server Not Starting

- Check port availability
- Verify build completed
- Check logs: `playwright-report/index.html`

### Browser Issues

- Reinstall browsers: `npx playwright install --force`
- Use different browser: `--project=firefox`

---

## Performance Thresholds

Current benchmarks targets:

| Operation | Target | Warning |
|-----------|--------|---------|
| Enqueue 100 jobs | < 100ms | > 500ms |
| Get jobs (100 iter) | < 200ms | > 1000ms |
| Cancel 50 jobs | < 100ms | > 500ms |
| API response | < 50ms | > 200ms |

---

## Coverage Reports

```bash
# Run with coverage (configure in vitest.config.ts)
npm run test:integration -w @mycluster/e2e -- --coverage

# View HTML report
open coverage/index.html
```

---

## Next Steps

- [ ] Add visual regression tests
- [ ] Add load testing (1000+ concurrent jobs)
- [ ] Add cross-browser testing
- [ ] Add mobile device testing
- [ ] Add accessibility tests
