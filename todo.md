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
- [ ] Initialize monorepo (pnpm workspaces or npm workspaces)
- [ ] Create `packages/core/` with package.json
- [ ] Configure TypeScript for core package
- [ ] Set up build pipeline (tsc → dist/)

### R1.2 Move LAN Discovery to Core
- [ ] Move `lan-discovery.ts` → `packages/core/src/discovery.ts`
- [ ] Move types to `packages/core/src/types.ts`
- [ ] Remove Electron `app.getPath` dependency → inject data dir
- [ ] Export clean API: `createCluster(config)`, `discoverComputers()`, etc.

### R1.3 Move Service Management to Core
- [ ] Move service detection logic to `packages/core/src/services/`
- [ ] Create service registry interface
- [ ] Add Ollama detection as first service plugin
- [ ] Design plugin architecture for future services

### R1.4 Storage Abstraction
- [ ] Create `StorageProvider` interface in core
- [ ] Move current YAML logic to `packages/storage-yaml/`
- [ ] Design async API with concurrency handling
- [ ] Add transaction support (begin/commit/rollback)

### R1.5 Update Electron to Use Core
- [ ] Install `@mycluster/core` as dependency
- [ ] Replace direct imports with core API calls
- [ ] Verify all LAN features still work
- [ ] Remove duplicated logic from main process

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
- [ ] Create `JobQueue` class in core
- [ ] Implement enqueue/dequeue/cancel/status
- [ ] Add job persistence (survives restart)
- [ ] Job history and cleanup (old jobs)

### R2.3 Job Execution Engine
- [ ] Worker pool for parallel execution
- [ ] Timeout handling
- [ ] Retry logic (configurable)
- [ ] Progress reporting (stdout/stderr streaming)

### R2.4 Job UI Components
- [ ] Job queue dashboard
- [ ] Create new job (script selection, target, args)
- [ ] Job status list with filtering
- [ ] Job detail view (logs, results, output files)
- [ ] Cancel/retry controls

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
- [ ] Create `packages/agent/` with Node.js CLI
- [ ] Agent registration with server (heartbeat)
- [ ] Job polling and execution
- [ ] Result upload (with file transfer)
- [ ] Graceful shutdown

### R3.3 Python Runner
- [ ] Create `runner.py` with argument parsing
- [ ] Execute script, capture stdout/stderr
- [ ] Handle file outputs (save to temp, return paths)
- [ ] Exit code handling
- [ ] Timeout enforcement

### R3.4 File Transfer System
- [ ] Result file upload endpoint
- [ ] File storage structure (`workspace/results/{jobId}/`)
- [ ] Cleanup old results (configurable retention)
- [ ] Download/stream results from GUI

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
- [ ] Create `packages/storage-sqlite/`
- [ ] Implement StorageProvider interface
- [ ] Add migrations system
- [ ] Connection pooling
- [ ] Prepared statements for performance

### R4.3 Migration from YAML
- [ ] Detect existing YAML data
- [ ] One-time migration tool
- [ ] Backup before migration
- [ ] Rollback option

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

*Last Updated: 2026-02-21 - Starting Monorepo Core Architecture Refactor*
*Branch: feat/monorepo-architecture*
