# Package Reference

## @mycluster/core

**Path:** `packages/core/`

Core orchestration engine for MyCluster. Pure TypeScript with no Electron dependencies.

### Installation

```bash
npm install @mycluster/core
```

### Exports

```typescript
// Types
export * from './types.js';

// Discovery
export { ping, scanIpRange, checkOllama, autoDetectServices, addComputerWithAutoDetect } from './discovery.js';

// Storage
export { MemoryStorage } from './storage-memory.js';

// Job Queue
export { JobQueue } from './job-queue.js';
```

### Types

#### Computer
```typescript
interface Computer {
  id: string;
  ipAddress: string;
  computerName: string;
  isOnline: boolean;
  lastSeen: string;
  addedDate: string;
  services?: Service[];
}
```

#### Service
```typescript
interface Service {
  id: string;
  type: 'ollama' | 'custom';
  name: string;
  enabled: boolean;
  port?: number;
  baseUrl?: string;
  config?: Record<string, unknown>;
  addedDate: string;
  lastChecked?: string;
  status?: 'online' | 'offline' | 'error';
  models?: string[];
}
```

#### Job
```typescript
interface Job {
  id: string;
  script: string;
  targetComputerId: string;
  args?: Record<string, unknown>;
  status: 'pending' | 'queued' | 'running' | 'complete' | 'failed' | 'cancelled';
  priority: number;
  result?: JobResult;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  timeout?: number;
}
```

### JobQueue

```typescript
const queue = new JobQueue({
  storage: new YamlStorage({ dataDir: '/path/to/data' }),
  maxConcurrent: 3,
  maxRetries: 3,
  jobTimeout: 300000, // 5 minutes
});

// Enqueue a job
const job = await queue.enqueue({
  script: "print('hello')",
  targetComputerId: 'computer_123',
  priority: 5,
});

// Get job status
const status = await queue.getJob(job.id);

// Cancel a job
await queue.cancel(job.id);

// Get statistics
const stats = await queue.getStats();
```

---

## @mycluster/storage-yaml

**Path:** `packages/storage-yaml/`

YAML file-based storage provider.

### Installation

```bash
npm install @mycluster/storage-yaml
```

### Usage

```typescript
import { YamlStorage } from '@mycluster/storage-yaml';

const storage = new YamlStorage({ dataDir: '/path/to/data' });

// Save a computer
await storage.saveComputer({
  id: 'computer_123',
  ipAddress: '192.168.1.100',
  computerName: 'My PC',
  isOnline: true,
  lastSeen: new Date().toISOString(),
  addedDate: new Date().toISOString(),
  services: [],
});

// Get all computers
const computers = await storage.getComputers();
```

---

## @mycluster/agent

**Path:** `packages/agent/`

Remote job executor agent with Python script support.

### Installation

```bash
npm install @mycluster/agent
```

### CLI Usage

```bash
# Basic usage
npm run start -w @mycluster/agent -- --server http://localhost:3000

# With all options
npm run start -w @mycluster/agent -- \
  --server http://192.168.1.50:3000 \
  --name "worker-pc" \
  --poll-interval 3000 \
  --concurrent 4 \
  --python "python3" \
  --workspace "/tmp/mycluster-agent"
```

### CLI Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--server` | `-s` | `http://localhost:3000` | Server URL |
| `--name` | `-n` | hostname | Agent name |
| `--poll-interval` | `-i` | `5000` | Poll interval (ms) |
| `--concurrent` | `-c` | `2` | Max concurrent jobs |
| `--python` | `-p` | `python` | Python executable path |
| `--workspace` | `-w` | temp dir | Workspace directory |

### Programmatic Usage

```typescript
import { Agent } from '@mycluster/agent';

const agent = new Agent({
  serverUrl: 'http://localhost:3000',
  agentName: 'my-agent',
  pollInterval: 5000,
  maxConcurrentJobs: 2,
  pythonPath: 'python3',
  workspaceDir: '/tmp/mycluster',
});

// Start the agent
await agent.start();

// Stop the agent
await agent.stop();
```

---

## @mycluster/desktop

**Path:** `apps/desktop/`

Electron desktop application.

### Scripts

```bash
# Development
npm run dev

# Build
npm run build

# Type check
npm run typecheck
```

### Dependencies

- React 19
- TypeScript 5.7
- Vite 6.2
- Electron 34.2
- Zustand 5.0
- React Router 7.2

---

## Package Dependencies

```
@mycluster/core (no internal deps)
    ↑
@mycluster/storage-yaml → @mycluster/core
    ↑
@mycluster/agent → @mycluster/core
    ↑
@mycluster/desktop → @mycluster/core, @mycluster/storage-yaml
```

---

*For API documentation, see [API_REFERENCE.md](./API_REFERENCE.md)*
