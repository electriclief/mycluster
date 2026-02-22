# MyCluster Documentation

**Version:** v0.0.2 | **Status:** Production Ready ✅

Welcome to the MyCluster documentation. This distributed compute cluster system coordinates APIs and batch jobs across multiple machines.

## 🚀 What's New in v0.0.2

- **File Storage** - Server-side result storage with automatic cleanup
- **Service Plugins** - Extensible plugin architecture for service detection
- **Auto Security** - Automatic API key authentication & audit logging
- **Docker/DevOps** - Docker containers & systemd deployment
- **E2E Testing** - Playwright tests & performance benchmarks

## Quick Links

| Document | Description |
|----------|-------------|
| [📖 Complete Guide](./COMPLETE_GUIDE.md) | **Start here!** Full system overview |
| [🚀 Quick Commands](./QUICK_COMMANDS.md) | Essential commands cheat sheet |
| [📦 Deployment Guide](./DEPLOYMENT.md) | Docker, systemd, production setup |
| [🔐 Security Guide](./SECURITY.md) | API keys & audit logging |
| [📁 File Storage](./FILE_STORAGE.md) | Results management |
| [🔌 Service Plugins](./SERVICE_PLUGINS.md) | Plugin architecture |
| [🧪 E2E Testing](./E2E_TESTING.md) | Testing & benchmarks |

## Full Documentation Index

### Getting Started
- [Architecture](./ARCHITECTURE.md) - System architecture and design
- [Packages](./PACKAGES.md) - Package reference guide
- [Agent Guide](./AGENT_GUIDE.md) - Setting up and running agents
- [API Reference](./API_REFERENCE.md) - Server API documentation
- [Job Queue](./JOB_QUEUE.md) - Job queue system guide

### Advanced Topics
- [Deployment](./DEPLOYMENT.md) - Docker, systemd, production deployment
- [Security](./SECURITY.md) - Authentication & audit logging
- [File Storage](./FILE_STORAGE.md) - Results management
- [Service Plugins](./SERVICE_PLUGINS.md) - Plugin architecture
- [E2E Testing](./E2E_TESTING.md) - Testing & benchmarks

### Release Information
- [Release Guide](./RELEASE_GUIDE_v0.0.2.md) - v0.0.2 release information
- [Release Notes](../RELEASE_NOTES.md) - Changelog

## Project Structure

```
mycluster/
├── packages/
│   ├── core/              # Core orchestration engine
│   ├── storage-yaml/      # YAML file storage provider
│   ├── storage-sqlite/    # SQLite storage provider
│   ├── server/            # Standalone HTTP server
│   ├── agent/             # Remote job executor agent
│   └── e2e/               # E2E tests & benchmarks
├── apps/
│   └── desktop/           # Electron desktop application
├── Docs/                  # This documentation folder
└── deploy/                # systemd service files
```

## Key Features

- **LAN Computer Discovery** - Auto-detect computers and services on your network
- **Job Queue System** - Submit Python scripts for batch execution
- **Agent System** - Remote agents execute jobs and return results
- **Service Detection** - Auto-detect services like Ollama on remote machines
- **Result Handling** - Support for text, image, video, and audio results
- **File Storage** - Persistent result storage with automatic cleanup
- **Security** - Automatic API keys, audit logging, permissions
- **Service Plugins** - Extensible plugin architecture

## Quick Start

### Desktop App
```bash
npm install
npm run dev
```

### Standalone Server
```bash
npm run start -w @mycluster/server -- --port 3000
```

### Agent
```bash
npm run start -w @mycluster/agent -- --server http://localhost:3000
```

### Docker
```bash
docker run -p 3000:3000 -v mycluster-data:/root/.mycluster mycluster/server:latest
```

## Installation

### Windows (v0.0.2)
- **Installer:** Download from [GitHub Releases](https://github.com/electriclief/mycluster/releases)
- **Portable:** Download standalone executable from Releases

### Docker
```bash
docker pull mycluster/server:latest
```

## Support

- **GitHub:** https://github.com/electriclief/mycluster
- **Issues:** https://github.com/electriclief/mycluster/issues
- **Discussions:** https://github.com/electriclief/mycluster/discussions

---

*MyCluster v0.0.2 - Phase R8 Production Hardening Complete!*
