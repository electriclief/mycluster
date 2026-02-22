# Quick Commands

## Development

```bash
# Start desktop app (development mode)
npm run dev

# Start with hot reload
npm run dev -- --watch
```

## Production Build

```bash
# Build all packages
npm run build

# Build specific package
npm run build -w @mycluster/core
npm run build -w @mycluster/server
npm run build -w @mycluster/desktop
```

## Server

```bash
# Start headless server (SQLite storage)
npm run start -w @mycluster/server -- --port 3000 --storage sqlite

# Start with YAML storage
npm run start -w @mycluster/server -- --port 3000 --storage yaml

# Custom data directory
npm run start -w @mycluster/server -- --port 8080 --data-dir /var/mycluster

# With authentication
npm run start -w @mycluster/server -- --port 3000 --auth-token my-secret-token
```

## Agent

```bash
# Start agent (connect to local server)
npm run start -w @mycluster/agent -- --server http://localhost:3000

# Connect to remote server
npm run start -w @mycluster/agent -- --server http://192.168.1.50:3000

# Custom agent name
npm run start -w @mycluster/agent -- --server http://localhost:3000 --name "worker-pc"

# High-performance worker (8 concurrent jobs)
npm run start -w @mycluster/agent -- \
  --server http://192.168.1.50:3000 \
  --concurrent 8 \
  --poll-interval 2000
```

## Testing

```bash
# Run all tests
npm run test -w @mycluster/core

# Watch mode (auto-rerun on changes)
npm run test:watch -w @mycluster/core

# With coverage report
npm run test:coverage -w @mycluster/core
```

## Type Checking

```bash
# Check all packages
npm run typecheck

# Check specific package
npm run typecheck -w @mycluster/core
npm run typecheck -w @mycluster/server
```

## Migration

```bash
# Migrate YAML to SQLite
node packages/storage-sqlite/dist/migrate.js /path/to/data
```

## Clean Build

```bash
# Clean all build artifacts
npm run clean

# Rebuild everything
npm run clean && npm install && npm run build
```

## Desktop App

```bash
# Development
npm run dev

# Build installers
npm run build

# Build without packaging (for testing)
npm run build:dir
```

## Docker (Future)

```bash
# Build server image
docker build -t mycluster-server:latest -f Dockerfile.server .

# Run server
docker run -p 3000:3000 -v /var/mycluster:/data mycluster-server

# Build agent image
docker build -t mycluster-agent:latest -f Dockerfile.agent .

# Run agent
docker run --network host mycluster-agent --server http://host.docker.internal:3000
```

## Environment Variables

```bash
# Server
PORT=3000
DATA_DIR=/var/mycluster
STORAGE_TYPE=sqlite
AUTH_TOKEN=your-token

# Agent
SERVER_URL=http://localhost:3000
AGENT_NAME=worker-1
POLL_INTERVAL=5000
MAX_CONCURRENT=2
```

## Useful Aliases

Add to your shell config (`.bashrc`, `.zshrc`):

```bash
# MyCluster shortcuts
alias mc-dev='npm run dev'
alias mc-server='npm run start -w @mycluster/server --'
alias mc-agent='npm run start -w @mycluster/agent --'
alias mc-test='npm run test -w @mycluster/core'
alias mc-build='npm run build'
```

---

*For detailed usage, see [COMPLETE_GUIDE.md](./COMPLETE_GUIDE.md)*
