# Deployment Guide

MyCluster can be deployed in various environments: Docker, Docker Compose, systemd, or bare metal.

## Quick Start

### Docker (Recommended)

```bash
# Pull and run server
docker run -d \
  -p 3000:3000 \
  -v mycluster-data:/root/.mycluster \
  --name mycluster-server \
  mycluster/server:latest

# Get server API key
docker logs mycluster-server | grep "Server API Key"
```

### Docker Compose

```bash
# Start server + agent
docker-compose up -d

# View logs
docker-compose logs -f server

# Scale agents
docker-compose --profile agents up -d --scale agent=3
```

---

## Docker Deployment

### Build Images

```bash
# Build server image
docker build -t mycluster/server:latest .

# Build agent image
docker build -f Dockerfile.agent -t mycluster/agent:latest .
```

### Run Server

```bash
docker run -d \
  --name mycluster-server \
  -p 3000:3000 \
  -v mycluster-data:/root/.mycluster \
  -v mycluster-results:/root/.mycluster/results \
  -e NODE_ENV=production \
  --restart unless-stopped \
  mycluster/server:latest
```

### Run Agent

```bash
docker run -d \
  --name mycluster-agent-1 \
  -v mycluster-workspace:/workspace \
  -e SERVER_URL=http://host.docker.internal:3000 \
  -e WORKSPACE_DIR=/workspace \
  --restart unless-stopped \
  mycluster/agent:latest
```

**Note:** On Linux, use `--network host` or the host IP instead of `host.docker.internal`.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `HOST` | 0.0.0.0 | Server host |
| `DATA_DIR` | /root/.mycluster | Data directory |
| `SERVER_URL` | http://localhost:3000 | Agent server URL |
| `WORKSPACE_DIR` | /workspace | Agent workspace |
| `PYTHON_PATH` | python3 | Python executable |

---

## Docker Compose

### Basic Setup (Server Only)

```yaml
# docker-compose.yml
version: '3.8'

services:
  server:
    image: mycluster/server:latest
    ports:
      - "3000:3000"
    volumes:
      - mycluster-data:/root/.mycluster
    restart: unless-stopped

volumes:
  mycluster-data:
```

### Full Setup (Server + Agents)

```yaml
# docker-compose.yml
version: '3.8'

services:
  server:
    image: mycluster/server:latest
    ports:
      - "3000:3000"
    volumes:
      - mycluster-data:/root/.mycluster
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  agent:
    image: mycluster/agent:latest
    depends_on:
      server:
        condition: service_healthy
    volumes:
      - mycluster-workspace:/workspace
    environment:
      - SERVER_URL=http://server:3000
    restart: unless-stopped
```

### Start Services

```bash
# Start all services
docker-compose up -d

# Start with agents
docker-compose --profile agents up -d

# View logs
docker-compose logs -f

# Scale agents to 5
docker-compose up -d --scale agent=5

# Stop all
docker-compose down
```

---

## systemd Deployment

### Install MyCluster

```bash
# Create user
sudo useradd -r -s /bin/false mycluster

# Install to /opt
sudo mkdir -p /opt/mycluster
sudo cp -r packages/* /opt/mycluster/
sudo cp -r node_modules /opt/mycluster/
sudo chown -R mycluster:mycluster /opt/mycluster

# Create data directory
sudo mkdir -p /var/lib/mycluster
sudo chown mycluster:mycluster /var/lib/mycluster
```

### Install Service Files

```bash
# Server service
sudo cp deploy/mycluster-server.service /etc/systemd/system/
sudo systemctl daemon-reload

# Agent service (optional)
sudo cp deploy/mycluster-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
```

### Manage Services

```bash
# Start server
sudo systemctl start mycluster-server

# Enable on boot
sudo systemctl enable mycluster-server

# View status
sudo systemctl status mycluster-server

# View logs
journalctl -u mycluster-server -f

# Restart
sudo systemctl restart mycluster-server

# Stop
sudo systemctl stop mycluster-server
```

---

## Bare Metal Installation

### Prerequisites

- Node.js 18+
- Python 3.8+
- npm or pnpm

### Install

```bash
# Clone repository
git clone https://github.com/electriclief/mycluster.git
cd mycluster

# Install dependencies
npm install

# Build
npm run build

# Start server
npm run start -w @mycluster/server -- --port 3000
```

### Production Setup

```bash
# Use PM2 for process management
npm install -g pm2

# Start server with PM2
pm2 start packages/server/dist/cli.js --name mycluster-server -- --port 3000

# Start agent
pm2 start packages/agent/dist/cli.js --name mycluster-agent-1 -- --server http://localhost:3000

# Save PM2 config
pm2 save

# Startup on boot
pm2 startup
```

---

## Configuration Examples

### High Availability Setup

```yaml
# docker-compose.ha.yml
version: '3.8'

services:
  server:
    image: mycluster/server:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
    volumes:
      - shared-storage:/root/.mycluster
    environment:
      - PORT=3000
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - server

volumes:
  shared-storage:
    driver: nfs
```

### Development Setup

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  server:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - SECURITY_ENABLED=false
    command: npm run dev -w @mycluster/server
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs mycluster-server

# Check volume permissions
docker run --rm -v mycluster-data:/data alpine ls -la /data

# Fix permissions
docker run --rm -v mycluster-data:/data alpine chown -R 1001:1001 /data
```

### Agent Can't Connect to Server

```bash
# Check network
docker exec mycluster-agent-1 ping server

# Check server is accessible
docker exec mycluster-agent-1 curl http://server:3000/api/health

# Use host network on Linux
docker run --network host mycluster/agent:latest
```

### Data Persistence

```bash
# Backup data
docker run --rm -v mycluster-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/mycluster-backup.tar.gz /data

# Restore data
docker run --rm -v mycluster-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/mycluster-backup.tar.gz -C /
```

---

## Performance Tuning

### Resource Limits

```yaml
services:
  server:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 1G
```

### Volume Optimization

Use named volumes for better performance:

```yaml
volumes:
  mycluster-data:
    driver: local
    driver_opts:
      type: none
      device: /fast/ssd/mycluster
      o: bind
```

---

## Security Considerations

1. **Use HTTPS**: Terminate TLS at reverse proxy (nginx, traefik)
2. **Firewall**: Only expose necessary ports
3. **Non-root**: Containers run as non-root user (UID 1001)
4. **Read-only filesystem**: Use `--read-only` flag where possible
5. **Secrets management**: Use Docker secrets or environment files

### Example: nginx TLS Termination

```nginx
# nginx.conf
upstream mycluster {
    server server:3000;
}

server {
    listen 80;
    server_name mycluster.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mycluster.example.com;

    ssl_certificate /etc/ssl/certs/mycluster.crt;
    ssl_certificate_key /etc/ssl/private/mycluster.key;

    location / {
        proxy_pass http://mycluster;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://mycluster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
