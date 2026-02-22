/**
 * Ollama Service Plugin
 * 
 * Detects and monitors Ollama API instances
 */

import { ServicePlugin, ServiceDetectionResult, ServiceHealthResult } from '../service-plugin.js';

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export interface OllamaMetadata {
  models: OllamaModel[];
  version?: string;
}

export class OllamaPlugin implements ServicePlugin {
  readonly type = 'ollama';
  readonly name = 'Ollama API';
  readonly defaultPorts = [11434];

  /**
   * Detect Ollama service
   */
  async detect(host: string, port: number): Promise<ServiceDetectionResult> {
    const baseUrl = `http://${host}:${port}`;

    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });

      if (!response.ok) {
        return {
          detected: false,
          error: `HTTP ${response.status}`,
        };
      }

      const data = (await response.json()) as { models?: OllamaModel[] };
      const models = data.models?.map((m) => m.name) || [];

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
      return {
        detected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check Ollama health
   */
  async checkHealth(host: string, port: number): Promise<ServiceHealthResult> {
    const baseUrl = `http://${host}:${port}`;

    try {
      // Check API endpoint
      const tagsResponse = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });

      if (!tagsResponse.ok) {
        return {
          healthy: false,
          status: 'error',
          error: `API returned ${tagsResponse.status}`,
        };
      }

      const data = (await tagsResponse.json()) as { models?: OllamaModel[] };
      const modelCount = data.models?.length || 0;

      // Check if any models are available
      const status: 'online' | 'degraded' = modelCount > 0 ? 'online' : 'degraded';

      return {
        healthy: true,
        status,
        details: {
          modelCount,
          models: data.models?.map((m) => m.name) || [],
        },
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'offline',
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Get Ollama metadata
   */
  async getMetadata(host: string, port: number): Promise<Record<string, unknown>> {
    const baseUrl = `http://${host}:${port}`;

    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as { models?: OllamaModel[] };

      // Try to get version info
      let version: string | undefined;
      try {
        const versionResponse = await fetch(`${baseUrl}/api/version`, {
          method: 'GET',
          signal: AbortSignal.timeout(1000),
        });
        if (versionResponse.ok) {
          const versionData = await versionResponse.json() as { version?: string };
          version = versionData.version;
        }
      } catch {
        // Version check failed, continue without it
      }

      return {
        models: data.models || [],
        version,
      } as Record<string, unknown>;
    } catch (error) {
      throw new Error(`Failed to get Ollama metadata: ${(error as Error).message}`);
    }
  }

  /**
   * Get configuration schema
   */
  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        models: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of available Ollama models',
        },
        defaultModel: {
          type: 'string',
          description: 'Default model to use for jobs',
        },
        maxConcurrentRequests: {
          type: 'number',
          description: 'Maximum concurrent requests to Ollama',
          default: 4,
        },
      },
    };
  }
}

// Export singleton instance
export const ollamaPlugin = new OllamaPlugin();
