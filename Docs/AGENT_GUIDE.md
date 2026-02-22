# Agent Setup Guide

## Overview

The MyCluster Agent is a lightweight CLI tool that runs on remote machines, polls the server for jobs, executes Python scripts, and returns results.

## Quick Start

### 1. Install Node.js

Ensure Node.js 18+ is installed on the agent machine:

```bash
node --version  # Should be v18 or higher
```

### 2. Clone and Install

```bash
git clone <your-repo-url> mycluster
cd mycluster
npm install
```

### 3. Start the Agent

```bash
npm run start -w @mycluster/agent -- --server http://YOUR_SERVER_IP:3000
```

## Configuration

### Command Line Options

```bash
npm run start -w @mycluster/agent -- [options]
```

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--server` | `-s` | `http://localhost:3000` | MyCluster server URL |
| `--name` | `-n` | hostname | Agent name for identification |
| `--poll-interval` | `-i` | `5000` | Job polling interval (milliseconds) |
| `--concurrent` | `-c` | `2` | Maximum concurrent jobs |
| `--python` | `-p` | `python` | Python executable path |
| `--workspace` | `-w` | temp dir | Workspace for job outputs |

### Examples

**Basic (connect to local server):**
```bash
npm run start -w @mycluster/agent
```

**Connect to remote server:**
```bash
npm run start -w @mycluster/agent -- --server http://192.168.1.50:3000
```

**High-performance worker:**
```bash
npm run start -w @mycluster/agent -- \
  --server http://192.168.1.50:3000 \
  --name "gpu-worker-1" \
  --concurrent 8 \
  --poll-interval 2000
```

**Custom Python path:**
```bash
npm run start -w @mycluster/agent -- \
  --server http://192.168.1.50:3000 \
  --python "/usr/bin/python3.11"
```

## Running as a Service

### Linux (systemd)

Create `/etc/systemd/system/mycluster-agent.service`:

```ini
[Unit]
Description=MyCluster Agent
After=network.target

[Service]
Type=simple
User=mycluster
WorkingDirectory=/opt/mycluster
ExecStart=/usr/bin/npm run start -w @mycluster/agent -- --server http://192.168.1.50:3000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable mycluster-agent
sudo systemctl start mycluster-agent
sudo systemctl status mycluster-agent
```

### Windows (NSSM)

1. Download [NSSM](https://nssm.cc/download)
2. Run `nssm install mycluster-agent`
3. Configure:
   - Path: `C:\Program Files\nodejs\npm.cmd`
   - Arguments: `run start -w @mycluster/agent -- --server http://192.168.1.50:3000`
   - Startup directory: `C:\mycluster`
4. Click "Install service"
5. Start: `nssm start mycluster-agent`

### macOS (launchd)

Create `~/Library/LaunchAgents/com.mycluster.agent.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.mycluster.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/npm</string>
        <string>run</string>
        <string>start</string>
        <string>-w</string>
        <string>@mycluster/agent</string>
        <string>--</string>
        <string>--server</string>
        <string>http://192.168.1.50:3000</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/yourname/mycluster</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Load and start:
```bash
launchctl load ~/Library/LaunchAgents/com.mycluster.agent.plist
launchctl start com.mycluster.agent
```

## Python Script Execution

### runner.py

The agent uses `runner.py` to execute Python scripts. It supports:

- Inline scripts
- Script files
- Output file capture
- Multiple output types (text, image, video, audio)

### Example Scripts

**Hello World:**
```python
print("Hello from the cluster!")
```

**Generate Image:**
```python
from PIL import Image
import os

# Create a simple image
img = Image.new('RGB', (100, 100), color='red')
img.save(os.path.join(output_dir, 'output.png'))
print("Image saved!")
```

**Process with Arguments:**
```python
# Access arguments passed from job
name = args.get('name', 'World')
print(f"Hello, {name}!")

# Process data
result = sum(range(100))
print(f"Sum: {result}")
```

## Monitoring

### Check Agent Status

From the server, check registered agents:

```bash
curl http://localhost:3000/api/agent/agents
```

### View Logs

Agent logs to console. For systemd services:

```bash
journalctl -u mycluster-agent -f
```

### Troubleshooting

**Agent not connecting:**
- Verify server URL is correct
- Check network connectivity
- Ensure server is running on port 3000

**Python not found:**
- Install Python 3.x
- Use `--python` flag to specify path: `--python /usr/bin/python3`

**Jobs not executing:**
- Check agent is registered: `GET /api/agent/agents`
- Verify job queue has pending jobs
- Check agent logs for errors

## Security Considerations

- Agents execute arbitrary Python code - only connect to trusted servers
- Run agents with minimal required permissions
- Consider using containers for isolation
- Enable HTTPS for non-trusted networks

---

*For server setup, see [ARCHITECTURE.md](./ARCHITECTURE.md)*
