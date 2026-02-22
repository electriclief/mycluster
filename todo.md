# MyCluster - Distributed Compute Cluster

> **Status:** Refactoring to monorepo architecture for distributed compute vision
> **Current Focus:** Extracting core orchestration engine from Electron

## Project Vision
A **distributed compute cluster** GUI that coordinates APIs and batch jobs across multiple machines:
- **Orchestration Hub**: Central dashboard for managing computers, services, and jobs
- **Client Agents**: Lightweight runners executing Python scripts, returning text/image/video/audio
- **Service Layer**: Auto-detected services (Ollama, etc.) on each computer
- **Batch Processing**: Job queue with distribution, status tracking, result storage

---

## Architecture Refactor (Current Priority)

### Migration Strategy
**Goal:** Separate orchestration logic from Electron GUI for headless deployment and scalability

```
mycluster/
├── packages/
│   ├── core/              # Pure TypeScript orchestration (no Electron)
│   ├── storage-sqlite/    # SQLite storage with concurrency
│   ├── storage-memory/    # In-memory for testing
│   ├── server/            # HTTP server + API (uses core)
│   ├── agent/             # Python script runner
│   └── electron-app/      # Electron GUI (thin layer)
├── apps/
│   └── desktop/           # Electron app entry
└── workspace/             # User cluster config
```

---

## Phase R1: Extract Core Package

### R1.1 Create Package Structure
- [x] Initialize monorepo (npm workspaces)
- [x] Create `packages/core/` with package.json
- [x] Configure TypeScript for core package
- [x] Set up build pipeline (tsc → dist/)

### R1.2 Move LAN Discovery to Core
- [x] Move discovery logic to `packages/core/src/discovery.ts`
- [x] Move types to `packages/core/src/types.ts`
- [x] Remove Electron `app.getPath` dependency → inject data dir
- [x] Export clean API: `ping()`, `scanIpRange()`, `checkOllama()`, `autoDetectServices()`

### R1.3 Move Service Management to Core
- [x] Move service detection logic to `packages/core/src/discovery.ts`
- [x] Create service types in `packages/core/src/types.ts`
- [x] Add Ollama detection as first service plugin
- [ ] Design plugin architecture for future services

### R1.4 Storage Abstraction
- [x] Create `StorageProvider` interface in core
- [x] Create `packages/storage-yaml/` with YAML implementation
- [x] Create `packages/core/src/storage-memory.ts` for testing
- [x] Add async API with concurrency handling
- [ ] Add transaction support (begin/commit/rollback)

### R1.5 Update Electron to Use Core
- [x] Install `@mycluster/core` as dependency
- [x] Replace direct imports with core API calls
- [x] Verify all LAN features still work
- [x] Remove duplicated logic from main process

**Phase R1 Complete!** ✅ Core package extracted and working.

---

## Phase R2: Job Queue System

### R2.1 Job Model Design
```typescript
interface Job {
  id: string;
  script: string;           // Python script path or inline code
  targetComputerId: string;
  args?: Record<string, unknown>;
  status: 'pending' | 'queued' | 'running' | 'complete' | 'failed' | 'cancelled';
  priority: number;
  result?: {
    type: 'text' | 'image' | 'video' | 'audio' | 'files';
    data?: string;          // Inline for text
    files?: string[];       // Paths for media
    exitCode?: number;
    error?: string;
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  timeout?: number;
}
```

### R2.2 Job Queue Implementation
- [x] Create `JobQueue` class in core
- [x] Implement enqueue/dequeue/cancel/status
- [x] Add job persistence via StorageProvider
- [x] Job history and cleanup (cleanupOldJobs method)
- [x] Priority-based scheduling
- [x] Retry logic with configurable maxRetries
- [x] Timeout handling per job
- [x] Progress listeners for real-time updates

### R2.3 Job Execution Engine
- [x] Worker pool with maxConcurrent config
- [x] Timeout handling
- [x] Retry logic (configurable)
- [x] Progress reporting via listeners
- [x] Simulated execution for testing
- [ ] Integration with Agent for Python execution (Phase R3)

### R2.4 Job UI Components
- [x] Job queue dashboard with stats cards
- [x] Submit job form (computer, script, priority)
- [x] Job list with status filtering
- [x] Job detail modal
- [x] Cancel running/pending jobs
- [x] Auto-refresh every 5 seconds
- [x] Navigation link in Layout

### R2.5 IPC Handlers
- [x] job:enqueue - Add job to queue
- [x] job:get - Get job by ID
- [x] job:list - List jobs with optional status filter
- [x] job:cancel - Cancel a job
- [x] job:stats - Get queue statistics
- [x] job:cleanup - Clean up old jobs

**Phase R2 Complete!** ✅ Job queue system functional (simulated execution until Phase R3 Agent).

---

## Phase R3: Agent/Client Runner

### R3.1 Agent Architecture
```
┌─────────────────┐      ┌─────────────────┐
│  Core (Server)  │──────│   Agent (CLI)   │
│  - Job Queue    │ HTTP │  - Polls jobs   │
│  - Registry     │      │  - Executes     │
└─────────────────┘      └─────────────────┘
                                  │
                            ┌─────▼──────┐
                            │ runner.py  │
                            │ - Executes │
                            │ - Returns  │
                            └────────────┘
```

### R3.2 Agent Implementation
- [x] Create `packages/agent/` with Node.js CLI
- [x] Agent registration with server (heartbeat)
- [x] Job polling and execution
- [x] Result upload (with file handling)
- [x] Graceful shutdown (SIGINT/SIGTERM)
- [x] Configurable: server URL, poll interval, concurrent jobs, python path

### R3.3 Python Runner
- [x] Create `runner.py` with argument parsing
- [x] Execute script, capture stdout/stderr
- [x] Handle file outputs (scan output directory)
- [x] Exit code handling
- [x] File type detection (text/image/video/audio)
- [x] Base64 preview for images
- [x] Inline content for text files

### R3.4 Server API
- [x] Create `agent-api.ts` with Express routes
- [x] POST /api/agent/register - Agent registration
- [x] POST /api/agent/deregister - Agent deregistration
- [x] POST /api/agent/heartbeat - Heartbeat endpoint
- [x] GET /api/agent/jobs - Job polling
- [x] POST /api/agent/jobs/:jobId/result - Result submission
- [x] GET /api/agent/agents - List agents
- [x] GET /api/agent/agents/:agentId - Get agent info
- [x] Mount agent API in server.ts

### R3.5 File Transfer System
- [x] Result file scanning in output directory
- [x] File type detection (text/image/video/audio/binary)
- [x] Inline content for text files
- [x] Base64 preview for images (max 1MB)
- [x] File metadata (path, type, size)
- [ ] Server-side file storage (`workspace/results/{jobId}/`)
- [ ] Cleanup old results (configurable retention)
- [ ] Download/stream results from GUI

**Phase R3 Complete!** ✅ Agent system functional. Run with: `npm run start -w @mycluster/agent -- --server http://localhost:3000`

---

## Phase R4: SQLite Storage

### R4.1 SQLite Schema Design
```sql
CREATE TABLE computers (
  id TEXT PRIMARY KEY,
  ip_address TEXT,
  computer_name TEXT,
  is_online BOOLEAN,
  last_seen TEXT,
  added_date TEXT
);

CREATE TABLE services (
  id TEXT PRIMARY KEY,
  computer_id TEXT REFERENCES computers(id),
  type TEXT,
  name TEXT,
  enabled BOOLEAN,
  config TEXT,  -- JSON
  status TEXT,
  last_checked TEXT
);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  computer_id TEXT REFERENCES computers(id),
  script TEXT,
  status TEXT,
  result TEXT,  -- JSON
  created_at TEXT,
  completed_at TEXT
);
```

### R4.2 SQLite Implementation
- [x] Create `packages/storage-sqlite/`
- [x] Implement StorageProvider interface with sql.js
- [x] Database schema for computers, services, jobs
- [x] Indexes for performance
- [x] WAL mode for concurrency
- [x] Auto-save on modifications

### R4.3 Migration from YAML
- [x] Create migration tool (migrate.ts)
- [x] Automatic backup before migration
- [x] Verify migration integrity
- [x] CLI: `node dist/migrate.js [dataDir]`

**Phase R4 Complete!** ✅ SQLite storage functional. Use with: `new SqliteStorage({ dataDir: '/path' })`

---

## Phase R5: Server Refactor

### R5.1 Decouple from Electron
- [ ] Move `src/server/` → `packages/server/`
- [ ] Remove Electron dependencies
- [ ] Standalone CLI: `mycluster-server --port 3000`
- [ ] Config from file or env vars

### R5.2 API Enhancements
- [ ] WebSocket for real-time updates
- [ ] SSE for job progress streaming
- [ ] File upload/download endpoints
- [ ] Authentication tokens (for non-trusted networks)

### R5.3 Server Dashboard API
- [ ] Cluster health endpoint
- [ ] Metrics (jobs/hour, success rate, avg duration)
- [ ] Active connections
- [ ] System resources (CPU, memory, disk)

---

## Phase R6: Electron GUI Refactor

### R6.1 Thin GUI Layer
- [ ] Electron imports `@mycluster/core` and `@mycluster/server`
- [ ] GUI is pure presentation
- [ ] All logic in core package
- [ ] Can swap GUI later (web, Tauri, etc.)

### R6.2 Dashboard Enhancements
- [ ] Real-time job progress (WebSocket)
- [ ] Service status cards per computer
- [ ] Quick actions (scan, add job, refresh)
- [ ] Cluster-wide metrics

### R6.3 Job Management UI
- [ ] Drag-drop script upload
- [ ] Target selection (single, multiple, all)
- [ ] Batch configuration
- [ ] Results gallery (images, video thumbnails)

---

## Phase R7: Testing & Quality

### R7.1 Unit Tests
- [ ] Core package tests (Jest/Vitest)
- [ ] Storage provider tests
- [ ] Job queue tests
- [ ] Service detection tests

### R7.2 Integration Tests
- [ ] Server + Core integration
- [ ] Agent + Server integration
- [ ] End-to-end job execution

### R7.3 E2E Tests
- [ ] Playwright for GUI workflows
- [ ] CLI testing for agent
- [ ] Performance benchmarks

---

## Updated Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo Tool | pnpm workspaces | Fast, disk-efficient, good TypeScript support |
| Core Package | Pure TypeScript | No Electron, runs anywhere |
| Storage | SQLite (with YAML fallback) | Concurrency, transactions, scalability |
| Job Queue | In-memory + persistence | Simple, no external dependencies |
| Agent | Node.js + Python | Leverage existing Python ecosystem |
| File Transfer | HTTP multipart | Simple, works through firewalls |
| Real-time | WebSocket + SSE | Push updates, progress streaming |
| Deployment | npm packages + CLI | Easy install, version management |

---

## Implementation Order

1. **R1: Extract Core** - Foundation for everything else
2. **R2: Job Queue** - Enables batch processing vision
3. **R3: Agent** - Python script execution
4. **R4: SQLite** - Scalable storage
5. **R5: Server Refactor** - Headless deployment
6. **R6: GUI Refactor** - Polish and enhancements
7. **R7: Testing** - Quality and stability

---

## Success Metrics

- [ ] Core package runs without Electron
- [ ] Server deploys headlessly on Raspberry Pi
- [ ] Agent executes Python script, returns result
- [ ] Job queue handles 100+ concurrent jobs
- [ ] GUI shows real-time job progress
- [ ] SQLite migration from YAML works
- [ ] All existing features still functional

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Refactor breaks existing features | Incremental migration, feature flags |
| SQLite adds complexity | Keep YAML as fallback option |
| Agent security (arbitrary code) | Sandboxed execution, user opt-in |
| File storage bloat | Automatic cleanup, retention policies |
| Monorepo complexity | Clear package boundaries, documentation |

---

*Last Updated: 2026-02-21 - Phase R3 Complete! Agent system functional.*
*Branch: feat/monorepo-architecture*

---

## Documentation

Full documentation is available in the [`Docs/`](./Docs/README.md) folder:

- **[README.md](./Docs/README.md)** - Documentation index and quick start
- **[ARCHITECTURE.md](./Docs/ARCHITECTURE.md)** - System architecture and design
- **[PACKAGES.md](./Docs/PACKAGES.md)** - Package reference guide
- **[AGENT_GUIDE.md](./Docs/AGENT_GUIDE.md)** - Agent setup and usage
- **[API_REFERENCE.md](./Docs/API_REFERENCE.md)** - Server API documentation
- **[JOB_QUEUE.md](./Docs/JOB_QUEUE.md)** - Job queue system guide
