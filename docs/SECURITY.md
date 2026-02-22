# Security & Authentication

MyCluster includes automatic API key authentication and comprehensive audit logging - **zero configuration required**.

## Overview

Security features are **enabled by default**:

- 🔐 **Automatic API Keys**: Generated on first startup, no user action needed
- 📝 **Audit Logging**: All API requests logged with context
- 🔑 **Permission-Based Access**: Different permissions for server, agents, and GUI
- ⏰ **Key Expiration**: Keys automatically expire after configurable period
- 🧹 **Automatic Cleanup**: Expired keys removed automatically

## Automatic Setup

When you start the server for the first time:

```bash
mycluster-server --port 3000
```

Output:
```
🚀 Starting MyCluster Server...

   Port: 3000
   Host: 0.0.0.0
   Data Dir: /home/user/.mycluster
   Storage: yaml
   Security: enabled (auto API keys)
   Auto Generate Keys: true
   Key Expiry: 365 days
   Audit Logging: all

🚀 MyCluster Server started on http://0.0.0.0:3000
   WebSocket: ws://0.0.0.0:3000/ws
   API: http://0.0.0.0:3000/api

🔐 Security enabled
   Server API Key: mc_a1b2c3d4e5f6...
   (Save this key for agent authentication)

✅ Server ready!
```

**That's it!** Security is automatic - no configuration needed.

## API Key Types

### Server Key
- **Auto-generated** on first startup
- **Permissions**: `admin` (full access)
- **Usage**: Agent authentication, administrative tasks
- **Expiration**: 365 days (configurable)
- **Storage**: `{dataDir}/api-keys.json`

### Agent Keys
- **Auto-generated** when agent registers
- **Permissions**: `jobs:read`, `jobs:write`, `agents:read`, `agents:write`, `results:write`
- **Usage**: Agent job polling and result submission
- **Expiration**: 365 days

### GUI Keys
- **Auto-generated** for desktop app
- **Permissions**: `jobs:*`, `computers:*`, `agents:read`, `results:*`
- **Usage**: Desktop GUI operations
- **Expiration**: 365 days

## Using API Keys

### With curl

```bash
# List jobs
curl -H "X-API-Key: mc_a1b2c3d4e5f6..." \
  http://localhost:3000/api/jobs

# Create job
curl -X POST \
  -H "X-API-Key: mc_a1b2c3d4e5f6..." \
  -H "Content-Type: application/json" \
  -d '{"script": "print(123)", "targetComputerId": "computer_1"}' \
  http://localhost:3000/api/jobs
```

### With JavaScript/TypeScript

```typescript
const API_KEY = 'mc_a1b2c3d4e5f6...';

// Get jobs
const response = await fetch('http://localhost:3000/api/jobs', {
  headers: {
    'X-API-Key': API_KEY,
  },
});
const jobs = await response.json();

// Create job
await fetch('http://localhost:3000/api/jobs', {
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    script: 'print("Hello")',
    targetComputerId: 'computer_1',
  }),
});
```

### With Agent

Agents automatically use the API key:

```bash
mycluster-agent \
  --server http://localhost:3000 \
  --api-key mc_a1b2c3d4e5f6...
```

## Security API Endpoints

### Get All Keys

```bash
GET /api/security/keys
```

Response:
```json
{
  "success": true,
  "keys": [
    {
      "name": "server",
      "type": "server",
      "createdAt": "2026-02-22T10:00:00.000Z",
      "lastUsed": "2026-02-22T15:30:00.000Z",
      "expiresAt": "2027-02-22T10:00:00.000Z",
      "permissions": ["admin"]
    },
    {
      "name": "agent_agent_123",
      "type": "agent",
      "createdAt": "2026-02-22T12:00:00.000Z",
      "lastUsed": "2026-02-22T15:25:00.000Z",
      "expiresAt": "2027-02-22T12:00:00.000Z",
      "permissions": ["jobs:read", "jobs:write", "agents:read", "agents:write", "results:write"]
    }
  ]
}
```

### Generate Agent Key

```bash
POST /api/security/keys/agent
Content-Type: application/json

{
  "agentId": "agent_123"
}
```

Response:
```json
{
  "success": true,
  "key": "mc_x7y8z9...",
  "agentId": "agent_123"
}
```

### Get Audit Logs

```bash
GET /api/security/audit-logs?limit=50
```

Response:
```json
{
  "success": true,
  "logs": [
    {
      "timestamp": "2026-02-22T15:30:00.000Z",
      "method": "POST",
      "path": "/api/jobs",
      "statusCode": 200,
      "duration": 45,
      "ipAddress": "192.168.1.100",
      "apiKey": "mc_a1b2...",
      "apiKeyName": "server",
      "action": "create",
      "resource": "jobs",
      "success": true
    }
  ]
}
```

### Get Audit Stats

```bash
GET /api/security/audit-stats
```

Response:
```json
{
  "success": true,
  "stats": {
    "totalRequests": 1542,
    "successfulRequests": 1498,
    "failedRequests": 44,
    "averageDuration": 32,
    "requestsByHour": {
      "2026-02-22T10": 150,
      "2026-02-22T11": 200
    },
    "topEndpoints": [
      { "path": "/api/jobs", "count": 500 },
      { "path": "/api/agent/jobs", "count": 350 }
    ]
  }
}
```

## Configuration

### Disable Security (Not Recommended)

```bash
mycluster-server --security-enabled false
```

### Customize Key Expiration

```bash
mycluster-server \
  --security-key-expiry 90 \
  --security-auto-keys true
```

### Audit Log Levels

- `all`: Log all requests (default)
- `errors`: Log only failed requests
- `admin`: Log only admin operations

```bash
mycluster-server --audit-log-level errors
```

### Disable Audit Logging

```bash
mycluster-server --audit-log-enabled false
```

## File Locations

| File | Purpose | Permissions |
|------|---------|-------------|
| `{dataDir}/api-keys.json` | API key storage | 600 (Unix only) |
| `{dataDir}/logs/audit-*.log` | Daily audit logs | 644 |

## Permission Reference

| Permission | Description |
|------------|-------------|
| `admin` | Full access to all resources |
| `jobs:read` | List and view jobs |
| `jobs:write` | Create and update jobs |
| `jobs:cancel` | Cancel running jobs |
| `computers:read` | List computers |
| `computers:write` | Add/remove computers |
| `agents:read` | List agents |
| `agents:write` | Register/deregister agents |
| `results:read` | View/download results |
| `results:write` | Upload result files |

## Security Best Practices

1. **Save the server key**: Copy it from startup logs to a secure location
2. **Use HTTPS in production**: Terminate TLS at reverse proxy
3. **Rotate keys periodically**: Delete and regenerate keys
4. **Monitor audit logs**: Check for suspicious activity
5. **Limit key permissions**: Use agent-specific keys with minimal permissions
6. **Set appropriate expiration**: Shorter expiry for high-security environments

## Troubleshooting

**"Authentication failed" error:**
- Verify API key is correct
- Check key hasn't expired
- Ensure key has required permissions

**Audit logs not appearing:**
- Check `--audit-log-enabled true`
- Verify `{dataDir}/logs` directory is writable
- Check audit log level filter

**Keys not persisting:**
- Check `{dataDir}/api-keys.json` exists
- Verify file permissions allow writing
- Ensure data directory is consistent across restarts

## Migration from Legacy Auth Token

If using `--auth-token`, migrate to automatic keys:

```bash
# Old way (deprecated)
mycluster-server --auth-token my-secret-token

# New way (automatic)
mycluster-server
# Server key auto-generated, shown in startup logs
```

Update clients to use new key:
```bash
# Old
curl -H "X-Auth-Token: my-secret-token" ...

# New
curl -H "X-API-Key: mc_auto_generated_key..." ...
```

## API Key File Format

```json
{
  "server": {
    "key": "mc_a1b2c3d4e5f6...",
    "name": "server",
    "type": "server",
    "createdAt": "2026-02-22T10:00:00.000Z",
    "lastUsed": "2026-02-22T15:30:00.000Z",
    "expiresAt": "2027-02-22T10:00:00.000Z",
    "permissions": ["admin"]
  },
  "agent_agent_123": {
    "key": "mc_x7y8z9...",
    "name": "agent_agent_123",
    "type": "agent",
    "createdAt": "2026-02-22T12:00:00.000Z",
    "lastUsed": "2026-02-22T15:25:00.000Z",
    "expiresAt": "2027-02-22T12:00:00.000Z",
    "permissions": ["jobs:read", "jobs:write", "agents:read", "agents:write", "results:write"]
  }
}
```
