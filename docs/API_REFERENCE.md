# API Reference

## Base URL

```
http://localhost:3000/api
```

## Agent API

### Register Agent

**POST** `/agent/register`

Register a new agent with the server.

**Request Body:**
```json
{
  "agentId": "agent_123456_abc",
  "agentName": "worker-pc",
  "hostname": "worker-pc.local",
  "platform": "win32",
  "pythonVersion": "Python 3.11.5"
}
```

**Response:**
```json
{
  "success": true,
  "agentId": "agent_123456_abc"
}
```

---

### Deregister Agent

**POST** `/agent/deregister`

Remove an agent from the server.

**Request Body:**
```json
{
  "agentId": "agent_123456_abc"
}
```

**Response:**
```json
{
  "success": true
}
```

---

### Heartbeat

**POST** `/agent/heartbeat`

Send a keep-alive signal to the server.

**Request Body:**
```json
{
  "agentId": "agent_123456_abc",
  "activeJobs": 2,
  "timestamp": "2026-02-21T12:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true
}
```

---

### Get Available Jobs

**GET** `/agent/jobs`

Poll for pending jobs to execute.

**Query Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | number | 5 | Maximum jobs to return |

**Response:**
```json
[
  {
    "id": "job_123456_xyz",
    "script": "print('hello')",
    "targetComputerId": "computer_abc",
    "args": {},
    "priority": 5,
    "timeout": 300000
  }
]
```

---

### Submit Job Result

**POST** `/agent/jobs/:jobId/result`

Submit the result of a completed job.

**Path Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `jobId` | string | Job ID |

**Request Body:**
```json
{
  "agentId": "agent_123456_abc",
  "result": {
    "stdout": "hello\n",
    "stderr": "",
    "exitCode": 0,
    "files": [
      {
        "path": "output.png",
        "type": "image",
        "size": 1024,
        "preview_base64": "iVBORw0KG..."
      }
    ],
    "duration_ms": 1234,
    "error": null
  }
}
```

**Response:**
```json
{
  "success": true
}
```

---

### List Agents

**GET** `/agent/agents`

Get all registered agents.

**Response:**
```json
[
  {
    "agentId": "agent_123456_abc",
    "agentName": "worker-pc",
    "hostname": "worker-pc.local",
    "platform": "win32",
    "pythonVersion": "Python 3.11.5",
    "registeredAt": "2026-02-21T10:00:00.000Z",
    "lastHeartbeat": "2026-02-21T12:00:00.000Z",
    "activeJobs": 2,
    "status": "online"
  }
]
```

---

### Get Agent

**GET** `/agent/agents/:agentId`

Get details for a specific agent.

**Path Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `agentId` | string | Agent ID |

**Response:**
```json
{
  "agentId": "agent_123456_abc",
  "agentName": "worker-pc",
  "hostname": "worker-pc.local",
  "platform": "win32",
  "pythonVersion": "Python 3.11.5",
  "registeredAt": "2026-02-21T10:00:00.000Z",
  "lastHeartbeat": "2026-02-21T12:00:00.000Z",
  "activeJobs": 2,
  "status": "online"
}
```

---

## Server API

### Health Check

**GET** `/health`

Check server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-21T12:00:00.000Z",
  "uptime": 3600000,
  "requestCount": 1234
}
```

---

### List Endpoints

**GET** `/endpoints`

Get all registered API endpoints.

**Response:**
```json
{
  "endpoints": [
    {
      "id": "ep_123",
      "name": "My Endpoint",
      "method": "POST",
      "path": "/api/my-endpoint"
    }
  ],
  "count": 1
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request body"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid authentication token"
}
```

### 404 Not Found
```json
{
  "error": "Agent not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

Currently, no rate limiting is enforced. For production deployments, consider adding:
- Request rate limiting per agent
- Maximum concurrent connections
- Job submission rate limits

---

*For usage examples, see [AGENT_GUIDE.md](./AGENT_GUIDE.md)*
