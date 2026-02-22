/**
 * Service Plugin Architecture
 * 
 * Plugins enable extensible service detection and management.
 * Each plugin handles a specific service type (Ollama, ComfyUI, etc.)
 */

import { Service, ServiceType } from './types.js';

/**
 * Service detection result
 */
export interface ServiceDetectionResult {
  detected: boolean;
  service?: Partial<Service>;
  error?: string;
}

/**
 * Service health check result
 */
export interface ServiceHealthResult {
  healthy: boolean;
  status: 'online' | 'offline' | 'degraded' | 'error';
  details?: Record<string, unknown>;
  error?: string;
}

/**
 * Service plugin interface
 */
export interface ServicePlugin {
  /**
   * Unique service type identifier
   */
  readonly type: ServiceType | string;

  /**
   * Human-readable service name
   */
  readonly name: string;

  /**
   * Default port(s) used by this service
   */
  readonly defaultPorts: number[];

  /**
   * Detect if service is running at given host
   */
  detect(host: string, port: number): Promise<ServiceDetectionResult>;

  /**
   * Check service health
   */
  checkHealth(host: string, port: number): Promise<ServiceHealthResult>;

  /**
   * Get service configuration schema (optional)
   * Returns JSON Schema for validation
   */
  getConfigSchema?(): Record<string, unknown>;

  /**
   * Get service metadata (optional)
   */
  getMetadata?(host: string, port: number): Promise<Record<string, unknown>>;
}

/**
 * Service plugin registry
 */
export class ServicePluginRegistry {
  private plugins: Map<string, ServicePlugin> = new Map();

  /**
   * Register a service plugin
   */
  register(plugin: ServicePlugin): void {
    this.plugins.set(plugin.type, plugin);
    console.log(`🔌 Service plugin registered: ${plugin.name} (${plugin.type})`);
  }

  /**
   * Unregister a service plugin
   */
  unregister(type: string): boolean {
    return this.plugins.delete(type);
  }

  /**
   * Get plugin by type
   */
  get(type: string): ServicePlugin | undefined {
    return this.plugins.get(type);
  }

  /**
   * Get all registered plugins
   */
  getAll(): ServicePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if plugin is registered
   */
  has(type: string): boolean {
    return this.plugins.has(type);
  }

  /**
   * Get count of registered plugins
   */
  count(): number {
    return this.plugins.size;
  }
}

/**
 * Default service plugin registry (singleton)
 */
export const defaultServiceRegistry = new ServicePluginRegistry();
