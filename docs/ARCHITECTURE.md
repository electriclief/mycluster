# MyCluster Architecture

## Overview

MyCluster is a distributed compute cluster system built on a monorepo architecture. It separates orchestration logic from the GUI for maximum flexibility and headless deployment.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MyCluster Desktop App                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   React     │  │   Job UI    │  │   LAN Computers UI      │ │
│  │  Dashboard  │  │  Components │  │   Services Display      │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │                │
│  ┌──────▼────────────────▼──────────────────────▼─────────────┐ │
│  │                    IPC Handlers                             │ │
│  └──────┬────────────────┬──────────────────────┬─────────────┘ │
│         │                │                      │                │
│  ┌──────▼──────┐  ┌──────▼──────┐      ┌──────▼─────────────┐  │
│  │ @mycluster/ │  │   Server    │      │   Storage Provider │  │
│  │    core     │  │   Service   │      │   (YAML/SQLite)    │  │
│  └─────────────┘  └──────┬──────┘      └────────────────────┘  │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTP/WebSocket
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌────────────────┐ ┌──────────────┐ ┌────────────────┐
│  Agent 1       │ │  Agent 2     │ │  Agent N       │
│  (Remote PC)   │ │  (Server)    │ │  (Raspberry Pi)│
│                │ │              │ │                │
│ ┌───────────┐  │ │ ┌──────────┐ │ │ ┌────────────┐│
│ │runner.py  │  │ │ │runner.py │ │ │ │ runner.py  ││
│ └───────────┘  │ │ └──────────┘ │ │ └────────────┘│
└────────────────┘ └──────────────┘ └────────────────┘
```

## Packages

### @mycluster/core

The core orchestration engine with no Electron dependencies.

**Features:**
- LAN discovery (ping, scan)
- Service detection (Ollama, etc.)
- Job queue management
- Storage provider interface

**Key Classes:**
- `JobQueue` - Job scheduling and execution
- `StorageProvider` - Abstract storage interface
- `ping()`, `scanIpRange()` - Network discovery
- `checkOllama()`, `autoDetectServices()` - Service detection

### @mycluster/storage-yaml

YAML file-based storage provider.

**Features:**
- Compatible with existing YAML format
- Async API with concurrency handling
- Computer and service registry

### @mycluster/agent

Remote job executor agent.

**Features:**
- Polls server for jobs
- Executes Python scripts via runner.py
- Reports results with file outputs
- Heartbeat system for status tracking

**Configuration:**
```bash
npm run start -w @mycluster/agent -- \
  --server http://localhost:3000 \
  --poll-interval 5000 \
  --concurrent 2 \
  --python python3
```

## Data Flow

### Job Execution Flow

1. User submits job via Desktop UI
2. Job added to `JobQueue` in core
3. Job marked as 'pending'
4. Agent polls `/api/agent/jobs`
5. Server returns pending jobs
6. Agent executes Python script via `runner.py`
7. Agent captures stdout/stderr/files
8. Agent POSTs result to `/api/agent/jobs/:id/result`
9. Job marked as 'complete' or 'failed'
10. UI auto-refreshes to show result

### Service Detection Flow

1. User adds computer by IP
2. System pings IP to verify online
3. `autoDetectServices()` checks common ports
4. Ollama detection queries `/api/tags`
5. Detected services added to computer record
6. Services displayed in UI with model count

## Storage Providers

### Interface

```typescript
interface StorageProvider {
  // Computers
  getComputers(): Promise<Computer[]>;
  saveComputer(computer: Computer): Promise<void>;
  updateComputer(id: string, updates: Partial<Computer>): Promise<void>;
  deleteComputer(id: string): Promise<void>;
  
  // Services
  addService(computerId: string, service: Omit<Service, 'id' | 'addedDate'>): Promise<Service>;
  removeService(computerId: string, serviceId: string): Promise<void>;
  updateService(computerId: string, serviceId: string, updates: Partial<Service>): Promise<void>;
  
  // Jobs
  getJobs(): Promise<Job[]>;
  saveJob(job: Job): Promise<void>;
  updateJob(id: string, updates: Partial<Job>): Promise<void>;
  deleteJob(id: string): Promise<void>;
}
```

### Implementations

| Provider | Use Case | Pros | Cons |
|----------|----------|------|------|
| `MemoryStorage` | Testing | Fast, no I/O | No persistence |
| `YamlStorage` | Single-user | Simple, readable | No concurrency |
| `SQLiteStorage` (planned) | Multi-user | Transactions, scalable | More complex |

## API Endpoints

### Agent API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agent/register` | Register new agent |
| POST | `/api/agent/deregister` | Remove agent |
| POST | `/api/agent/heartbeat` | Keep-alive |
| GET | `/api/agent/jobs` | Poll for jobs |
| POST | `/api/agent/jobs/:id/result` | Submit result |
| GET | `/api/agent/agents` | List agents |
| GET | `/api/agent/agents/:id` | Get agent info |

### Server API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/endpoints` | List registered endpoints |
| POST | `/api/endpoints` | Register endpoint |
| DELETE | `/api/endpoints/:id` | Unregister endpoint |

## Security Model

- **LAN Trust Model**: Zero-config authentication for trusted networks
- **Auto-generated Tokens**: Instance ID and auth token generated on first launch
- **Token Validation**: Automatic token exchange between instances
- **Optional HTTPS**: Can be enabled for non-trusted networks

## Deployment Options

### Desktop App (All-in-One)
- Server + GUI + Job Queue in one process
- Best for: Single-machine development/testing

### Headless Server
- Server + Job Queue without GUI
- Best for: Raspberry Pi, dedicated server

### Distributed Agents
- Multiple agents on different machines
- Central server coordinates jobs
- Best for: Compute cluster, batch processing

---

*For package-specific documentation, see [PACKAGES.md](./PACKAGES.md)*
