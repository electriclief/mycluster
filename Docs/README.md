# MyCluster Documentation

Welcome to the MyCluster documentation. This distributed compute cluster system coordinates APIs and batch jobs across multiple machines.

## Quick Start

```bash
# Install dependencies
npm install

# Run development mode
npm run dev

# Build all packages
npm run build
```

## Documentation Index

| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | System architecture and design |
| [Packages](./PACKAGES.md) | Package reference guide |
| [Agent Guide](./AGENT_GUIDE.md) | Setting up and running agents |
| [API Reference](./API_REFERENCE.md) | Server API documentation |
| [Job Queue](./JOB_QUEUE.md) | Job queue system guide |

## Project Structure

```
mycluster/
├── packages/
│   ├── core/           # Core orchestration engine
│   ├── storage-yaml/   # YAML file storage provider
│   └── agent/          # Remote job executor agent
├── apps/
│   └── desktop/        # Electron desktop application
└── Docs/               # This documentation folder
```

## Key Features

- **LAN Computer Discovery** - Auto-detect computers and services on your network
- **Job Queue System** - Submit Python scripts for batch execution
- **Agent System** - Remote agents execute jobs and return results
- **Service Detection** - Auto-detect services like Ollama on remote machines
- **Result Handling** - Support for text, image, video, and audio results

## Getting Started

1. **Desktop App**: Run `npm run dev` to start the Electron app
2. **Agent**: Run `npm run start -w @mycluster/agent -- --server http://localhost:3000`
3. **Submit Jobs**: Use the Jobs tab in the desktop app

---

*For more information, see the individual documentation pages.*
