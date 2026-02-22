/**
 * Core types for MyCluster distributed compute orchestration
 */

// Computer/Node in the cluster
export interface Computer {
  id: string;
  ipAddress: string;
  computerName: string;
  isOnline: boolean;
  lastSeen: string;
  addedDate: string;
  services?: Service[];
}

// Service running on a computer
export interface Service {
  id: string;
  type: ServiceType;
  name: string;
  enabled: boolean;
  port?: number;
  baseUrl?: string;
  config?: Record<string, unknown>;
  addedDate: string;
  lastChecked?: string;
  status?: 'online' | 'offline' | 'error';
  models?: string[];
}

export type ServiceType = 'ollama' | 'custom';

// Job for batch processing
export interface Job {
  id: string;
  script: string;
  targetComputerId: string;
  args?: Record<string, unknown>;
  status: JobStatus;
  priority: number;
  result?: JobResult;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  timeout?: number;
}

export type JobStatus = 'pending' | 'queued' | 'running' | 'complete' | 'failed' | 'cancelled';

export interface JobResult {
  type: 'text' | 'image' | 'video' | 'audio' | 'files';
  data?: string;
  files?: string[];
  exitCode?: number;
  error?: string;
}

// Storage provider interface
export interface StorageProvider {
  // Computer operations
  getComputers(): Promise<Computer[]>;
  saveComputer(computer: Computer): Promise<void>;
  updateComputer(id: string, updates: Partial<Computer>): Promise<void>;
  deleteComputer(id: string): Promise<void>;

  // Service operations
  addService(computerId: string, service: Omit<Service, 'id' | 'addedDate'>): Promise<Service>;
  removeService(computerId: string, serviceId: string): Promise<void>;
  updateService(computerId: string, serviceId: string, updates: Partial<Service>): Promise<void>;

  // Job operations
  getJobs(): Promise<Job[]>;
  saveJob(job: Job): Promise<void>;
  updateJob(id: string, updates: Partial<Job>): Promise<void>;
  deleteJob(id: string): Promise<void>;
}

// Cluster configuration
export interface ClusterConfig {
  dataDir: string;
  storageProvider: StorageProvider;
}

// Discovery result
export interface ScanResult {
  ip: string;
  isOnline: boolean;
}

// Ollama detection result
export interface OllamaResult {
  available: boolean;
  models?: string[];
  error?: string;
}
