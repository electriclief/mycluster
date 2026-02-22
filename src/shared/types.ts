// Shared types for MyCluster application

export interface AppConfig {
  mode: 'server' | 'client';
  serverPort: number;
  allowedOrigins: string[];
  apiEndpoints?: ApiEndpoint[];
  discoveredServers?: DiscoveredServer[];
  instanceId: string;
  authToken?: string;
}

export interface ApiEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler?: string; // Serialized handler reference
  requiresAuth?: boolean;
}

export interface DiscoveredServer {
  id: string;
  name: string;
  address: string;
  port: number;
  lastSeen: Date;
  status: 'online' | 'offline' | 'unknown';
}

export interface SavedRequest {
  id: string;
  name: string;
  collectionId?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: string;
  variables?: Record<string, string>;
}

export interface RequestCollection {
  id: string;
  name: string;
  requestIds: string[];
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  responseTime: number;
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: unknown;
}
