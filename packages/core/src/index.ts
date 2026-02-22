/**
 * @mycluster/core - Core orchestration engine for MyCluster
 */

// Types
export * from './types.js';

// Discovery
export { ping, scanIpRange, checkOllama, autoDetectServices, addComputerWithAutoDetect } from './discovery.js';

// Storage
export { MemoryStorage } from './storage-memory.js';

// Job Queue
export { JobQueue } from './job-queue.js';
export type { JobQueueOptions, JobProgress, JobListener } from './job-queue.js';

// Service Plugin System
export {
  ServicePluginRegistry,
  defaultServiceRegistry,
  type ServicePlugin,
  type ServiceDetectionResult,
  type ServiceHealthResult,
} from './service-plugin.js';

// Built-in Service Plugins
export { OllamaPlugin, ollamaPlugin, type OllamaModel, type OllamaMetadata } from './plugins/ollama-plugin.js';
