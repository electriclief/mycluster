# MyCluster - Complete Documentation

> **Version:** 0.1.0  
> **Status:** Production Ready (R1-R6 Complete)  
> **Branch:** feat/monorepo-architecture

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Packages](#packages)
5. [Deployment Guide](#deployment-guide)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)

---

## Overview

MyCluster is a **distributed compute cluster** system that coordinates APIs and batch jobs across multiple machines. It enables you to:

- **Discover computers** on your LAN automatically
- **Detect services** like Ollama running on remote machines
- **Submit Python jobs** for batch execution across the cluster
- **Monitor progress** in real-time via WebSocket
- **Scale horizontally** by adding more agent nodes

### Key Features

| Feature | Description |
|---------|-------------|
| 🖥️ LAN Discovery | Auto-detect computers by ping scanning IP ranges |
| 🔍 Service Detection | Auto-detect Ollama and other services with model enumeration |
| 📝 Job Queue | Priority-based job scheduling with retry logic |
| 🤖 Python Agents | Remote execution of Python scripts with result capture |
| 📊 Real-time Updates | WebSocket-based live progress updates |
| 💾 Flexible Storage | YAML (simple) or SQLite (scalable) storage backends |
| 🚀 Headless Server | Run on Raspberry Pi or any server without GUI |

---

## Quick Start

### Prerequisites

- Node.js 18+ 
- Python 3.x (for agent script execution)
- npm or pnpm

### Installation

```bash
# Clone and install
git clone <your-repo> mycluster
cd mycluster
npm install
```

### Start Desktop App (All-in-One)

```bash
npm run dev
```

This starts the Electron app with:
- GUI dashboard
- Embedded server
- Job queue
- LAN discovery

### Start Headless Server

```bash
# With SQLite storage
npm run start -w @mycluster/server -- --port 3000 --storage sqlite

# With YAML storage
npm run start -w @mycluster/server -- --port 3000 --storage yaml --data-dir /var/mycluster
```

### Start Agent on Worker Machine

```bash
npm run start -w @mycluster/agent -- --server http://192.168.1.50:3000 --name "worker-pc"
```

---

## Architecture

### System Diagram

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

### Package Dependencies

```
@mycluster/core (no internal deps)
    ↑
@mycluster/storage-yaml → @mycluster/core
@mycluster/storage-sqlite → @mycluster/core
    ↑
@mycluster/agent → @mycluster/core
@mycluster/server → @mycluster/core, @mycluster/storage-*
    ↑
@mycluster/desktop → @mycluster/core, @mycluster/storage-*
```

---

## Packages

### @mycluster/core

**Path:** `packages/core/`

Core orchestration engine with no Electron dependencies.

**Exports:**
- `JobQueue` - Job scheduling and execution
- `MemoryStorage` - In-memory storage for testing
- `ping()`, `scanIpRange()` - Network discovery
- `checkOllama()`, `autoDetectServices()` - Service detection

**Usage:**
```typescript
import { JobQueue, MemoryStorage } from '@mycluster/core';

const queue = new JobQueue({
  storage: new MemoryStorage(),
  maxConcurrent: 3,
  maxRetries: 3,
});

const job = await queue.enqueue({
  script: "print('hello')",
  targetComputerId: 'computer_123',
  priority: 5,
});
```

### @mycluster/storage-yaml

**Path:** `packages/storage-yaml/`

YAML file-based storage provider.

**Usage:**
```typescript
import { YamlStorage } from '@mycluster/storage-yaml';

const storage = new YamlStorage({ dataDir: '/path/to/data' });
const computers = await storage.getComputers();
```

### @mycluster/storage-sqlite

**Path:** `packages/storage-sqlite/`

SQLite storage with better concurrency.

**Usage:**
```typescript
import { SqliteStorage } from '@mycluster/storage-sqlite';

const storage = new SqliteStorage({ dataDir: '/path/to/data' });
await storage.initialize();
```

### @mycluster/agent

**Path:** `packages/agent/`

Remote job executor with Python script support.

**CLI Usage:**
```bash
npm run start -w @mycluster/agent -- \
  --server http://localhost:3000 \
  --name "worker-pc" \
  --poll-interval 5000 \
  --concurrent 2
```

### @mycluster/server

**Path:** `packages/server/`

Standalone HTTP server with WebSocket support.

**CLI Usage:**
```bash
npm run start -w @mycluster/server -- \
  --port 3000 \
  --host 0.0.0.0 \
  --storage sqlite \
  --data-dir /var/mycluster
```

### @mycluster/desktop

**Path:** `apps/desktop/`

Electron desktop application.

**Scripts:**
```bash
npm run dev      # Development
npm run build    # Production build
```

---

## Deployment Guide

### Desktop Deployment (Windows)

1. Build the application:
```bash
npm run build
```

2. Find installers in `release/` folder:
   - `MyCluster Setup 0.1.0.exe` - NSIS installer
   - `MyCluster 0.1.0.exe` - Portable executable

### Headless Server (Linux/Raspberry Pi)

1. Install Node.js 18+:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Install MyCluster:
```bash
git clone <repo> mycluster
cd mycluster
npm install --production
```

3. Create systemd service (`/etc/systemd/system/mycluster-server.service`):
```ini
[Unit]
Description=MyCluster Server
After=network.target

[Service]
Type=simple
User=mycluster
WorkingDirectory=/opt/mycluster
ExecStart=/usr/bin/npm run start -w @mycluster/server -- --port 3000 --storage sqlite
Restart=always

[Install]
WantedBy=multi-user.target
```

4. Enable and start:
```bash
sudo systemctl enable mycluster-server
sudo systemctl start mycluster-server
sudo systemctl status mycluster-server
```

### Agent Deployment

1. Install on worker machine:
```bash
git clone <repo> mycluster-agent
cd mycluster-agent
npm install --production
```

2. Start agent:
```bash
npm run start -w @mycluster/agent -- \
  --server http://server-ip:3000 \
  --name "worker-$(hostname)"
```

3. (Optional) Run as service using NSSM (Windows) or systemd (Linux)

---

## API Reference

### Base URL

```
http://localhost:3000/api
```

### Endpoints

#### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-21T12:00:00.000Z",
  "uptime": 3600000,
  "requestCount": 1234
}
```

#### Server Stats
```http
GET /api/stats
```

**Response:**
```json
{
  "isRunning": true,
  "port": 3000,
  "uptime": 3600000,
  "requestCount": 1234,
  "wsConnections": 5,
  "agents": { "total": 3, "online": 2 },
  "jobs": { "pending": 5, "running": 2, "completed": 50, "failed": 1 },
  "computers": { "total": 10, "online": 8 }
}
```

#### Computers
```http
GET /api/computers
POST /api/computers
DELETE /api/computers/:id
```

#### Jobs
```http
GET /api/jobs?status=pending
POST /api/jobs
POST /api/jobs/:id/cancel
GET /api/jobs/stats
```

#### Agents
```http
POST /api/agent/register
POST /api/agent/deregister
POST /api/agent/heartbeat
GET /api/agent/jobs
POST /api/agent/jobs/:id/result
GET /api/agent/agents
```

### WebSocket

Connect to `ws://localhost:3000/ws` for real-time updates.

**Events:**
- `connected` - Connection established
- `job-progress` - Job status update

---

## Troubleshooting

### Agent Not Connecting

1. Verify server URL is correct
2. Check network connectivity: `ping server-ip`
3. Ensure server is running on port 3000
4. Check firewall rules

### Python Not Found

1. Install Python 3.x
2. Use `--python` flag: `--python /usr/bin/python3`
3. Verify: `python --version`

### Jobs Not Executing

1. Check agent is registered: `GET /api/agent/agents`
2. Verify job queue has pending jobs: `GET /api/jobs?status=pending`
3. Check agent logs for errors

### Database Errors (SQLite)

1. Check file permissions on data directory
2. Try deleting `mycluster.db` and restarting
3. Fallback to YAML: `--storage yaml`

### WebSocket Disconnections

1. Check network stability
2. Verify server isn't overloaded
3. Auto-reconnect is enabled (5s interval)

---

## Testing

### Run Unit Tests

```bash
npm run test -w @mycluster/core
```

### Test Coverage

```bash
npm run test:coverage -w @mycluster/core
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Run tests: `npm run test`
5. Submit pull request

---

## License

MIT License - See LICENSE file for details.

---

*Documentation generated: 2026-02-21*  
*MyCluster v0.1.0*
