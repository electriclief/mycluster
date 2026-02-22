# Service Plugin Architecture

MyCluster uses a plugin-based architecture for service detection and management. This allows easy extension to support new services without modifying core code.

## Overview

Service plugins handle:
- **Detection**: Automatically discover services on networked computers
- **Health Monitoring**: Check if services are online and functioning
- **Metadata**: Retrieve service-specific information (models, version, etc.)
- **Configuration**: Define service-specific settings

## Built-in Plugins

### Ollama Plugin

Detects and monitors Ollama API instances.

**Type:** `ollama`  
**Default Port:** 11434  
**Features:**
- Auto-detects Ollama instances on LAN
- Lists available models
- Health checking with model count validation
- Version detection

**Usage:**
```typescript
import { ollamaPlugin } from '@mycluster/core';

// Detect Ollama service
const result = await ollamaPlugin.detect('192.168.1.100', 11434);
if (result.detected) {
  console.log('Ollama found:', result.service);
}

// Check health
const health = await ollamaPlugin.checkHealth('192.168.1.100', 11434);
console.log('Health status:', health.status);

// Get metadata
const metadata = await ollamaPlugin.getMetadata('192.168.1.100', 11434);
console.log('Available models:', metadata.models);
```

## Creating Custom Plugins

Create a new plugin by implementing the `ServicePlugin` interface:

```typescript
import {
  ServicePlugin,
  ServiceDetectionResult,
  ServiceHealthResult,
} from '@mycluster/core';

export class ComfyUIPlugin implements ServicePlugin {
  readonly type = 'comfyui';
  readonly name = 'ComfyUI';
  readonly defaultPorts = [8188];

  async detect(host: string, port: number): Promise<ServiceDetectionResult> {
    const baseUrl = `http://${host}:${port}`;
    
    try {
      const response = await fetch(`${baseUrl}/system_stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });

      if (!response.ok) {
        return { detected: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      
      return {
        detected: true,
        service: {
          type: this.type,
          name: this.name,
          port,
          baseUrl,
          config: {
            systemStats: data,
          },
          status: 'online' as const,
        },
      };
    } catch (error) {
      return {
        detected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkHealth(host: string, port: number): Promise<ServiceHealthResult> {
    const baseUrl = `http://${host}:${port}`;
    
    try {
      const response = await fetch(`${baseUrl}/system_stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });

      if (!response.ok) {
        return { healthy: false, status: 'error' };
      }

      const data = await response.json();
      
      return {
        healthy: true,
        status: 'online',
        details: { systemStats: data },
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'offline',
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async getMetadata(host: string, port: number): Promise<Record<string, unknown>> {
    const baseUrl = `http://${host}:${port}`;
    
    try {
      const [systemStats, objectInfo] = await Promise.all([
        fetch(`${baseUrl}/system_stats`).then(r => r.json()),
        fetch(`${baseUrl}/object_info`).then(r => r.json()),
      ]);

      return {
        systemStats,
        objectInfo,
        nodes: Object.keys(objectInfo || {}),
      };
    } catch (error) {
      throw new Error(`Failed to get metadata: ${(error as Error).message}`);
    }
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        gpuMode: {
          type: 'string',
          description: 'GPU execution mode',
          enum: ['auto', 'cpu', 'cuda'],
        },
        maxWorkers: {
          type: 'number',
          description: 'Maximum concurrent workers',
          default: 1,
        },
      },
    };
  }
}

export const comfyUIPlugin = new ComfyUIPlugin();
```

## Registering Plugins

Register plugins with the service registry:

```typescript
import { defaultServiceRegistry, comfyUIPlugin } from '@mycluster/core';

// Register custom plugin
defaultServiceRegistry.register(comfyUIPlugin);

// Check if registered
if (defaultServiceRegistry.has('comfyui')) {
  console.log('ComfyUI plugin is registered');
}

// Get all plugins
const plugins = defaultServiceRegistry.getAll();
console.log(`Loaded ${plugins.length} service plugins`);
```

## Plugin Registry API

### Methods

| Method | Description |
|--------|-------------|
| `register(plugin)` | Register a service plugin |
| `unregister(type)` | Unregister a plugin by type |
| `get(type)` | Get plugin by type |
| `getAll()` | Get all registered plugins |
| `has(type)` | Check if plugin is registered |
| `count()` | Get number of registered plugins |

## Service Detection Flow

When detecting services on a computer:

1. **Ping**: Check if computer is online
2. **Plugin Scan**: For each registered plugin:
   - Try each default port
   - Call `plugin.detect(host, port)`
   - Collect detected services
3. **Store**: Save detected services to computer record

```typescript
import { autoDetectServices, defaultServiceRegistry } from '@mycluster/core';

// Auto-detect all services using registered plugins
const services = await autoDetectServices('192.168.1.100');

// Services array contains all detected services from all plugins
services.forEach(service => {
  console.log(`Found ${service.type} on port ${service.port}`);
});
```

## Health Checking

Plugins provide health status for monitoring:

```typescript
import { defaultServiceRegistry } from '@mycluster/core';

const plugin = defaultServiceRegistry.get('ollama');
if (plugin) {
  const health = await plugin.checkHealth('192.168.1.100', 11434);
  
  switch (health.status) {
    case 'online':
      console.log('Service is healthy');
      break;
    case 'degraded':
      console.log('Service is running but degraded');
      break;
    case 'offline':
      console.log('Service is offline');
      break;
    case 'error':
      console.log('Error checking service');
      break;
  }
}
```

## Configuration Schema

Plugins can define configuration schemas for validation:

```typescript
const schema = ollamaPlugin.getConfigSchema();
console.log(JSON.stringify(schema, null, 2));
// Output: JSON Schema for service configuration
```

## Example: Stable Diffusion WebUI Plugin

```typescript
import {
  ServicePlugin,
  ServiceDetectionResult,
  ServiceHealthResult,
} from '@mycluster/core';

export class StableDiffusionPlugin implements ServicePlugin {
  readonly type = 'stable-diffusion';
  readonly name = 'Stable Diffusion WebUI';
  readonly defaultPorts = [7860];

  async detect(host: string, port: number): Promise<ServiceDetectionResult> {
    const baseUrl = `http://${host}:${port}`;
    
    try {
      const response = await fetch(`${baseUrl}/sdapi/v1/sd-models`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });

      if (!response.ok) {
        return { detected: false };
      }

      const models = await response.json();
      
      return {
        detected: true,
        service: {
          type: this.type,
          name: this.name,
          port,
          baseUrl,
          config: { models },
          status: 'online' as const,
        },
      };
    } catch (error) {
      return { detected: false, error: (error as Error).message };
    }
  }

  async checkHealth(host: string, port: number): Promise<ServiceHealthResult> {
    try {
      const response = await fetch(`http://${host}:${port}/sdapi/v1/sd-models`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });

      return {
        healthy: response.ok,
        status: response.ok ? 'online' : 'offline',
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'offline',
        error: (error as Error).message,
      };
    }
  }
}

export const stableDiffusionPlugin = new StableDiffusionPlugin();
```

## Best Practices

1. **Timeout Handling**: Always use `AbortSignal.timeout()` for network requests
2. **Error Handling**: Catch all errors, return structured error responses
3. **Minimal Dependencies**: Plugins should use only core APIs
4. **Type Safety**: Define interfaces for plugin-specific types
5. **Documentation**: Document all plugin methods and configuration options

## Future Plugin Ideas

- **ComfyUI**: Workflow-based Stable Diffusion
- **Stable Diffusion WebUI**: AUTOMATIC1111 interface
- **Jupyter**: Notebook server detection
- **VS Code Server**: Remote development
- **Custom HTTP APIs**: Generic REST API detection
- **Database Services**: PostgreSQL, MySQL, MongoDB
- **Message Queues**: Redis, RabbitMQ, Kafka

## Contributing Plugins

To contribute a new plugin:

1. Create plugin file in `packages/core/src/plugins/`
2. Implement `ServicePlugin` interface
3. Export singleton instance
4. Add to `packages/core/src/index.ts` exports
5. Register in `packages/core/src/discovery.ts`
6. Add documentation to `Docs/SERVICE_PLUGINS.md`
