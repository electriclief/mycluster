import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Server as HttpServer } from 'http';
import { ApiEndpoint, LogEntry } from '@shared/types';

export interface ServerConfig {
  port: number;
  allowedOrigins: string[];
  authToken?: string;
}

export interface ServerStats {
  isRunning: boolean;
  port: number;
  requestCount: number;
  startTime: Date | null;
  endpoints: string[];
}

export class ServerService {
  private app: Express | null = null;
  private server: HttpServer | null = null;
  private config: ServerConfig | null = null;
  private endpoints: Map<string, ApiEndpoint> = new Map();
  private requestCount = 0;
  private startTime: Date | null = null;
  private logs: LogEntry[] = [];

  constructor() {}

  initialize(config: ServerConfig): void {
    this.config = config;
    this.app = express();

    // CORS configuration
    this.app.use(cors({
      origin: config.allowedOrigins.length > 0 ? config.allowedOrigins : '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Instance-ID', 'X-Auth-Token'],
    }));

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      this.requestCount++;

      this.log('info', `Incoming request: ${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.log('info', `Request completed: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
          statusCode: res.statusCode,
          duration,
        });
      });

      next();
    });

    // JSON body parser
    this.app.use(express.json());
    this.app.use(express.text());

    // Auth middleware (invisible - auto-validates tokens)
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      // Skip auth for health check
      if (req.path === '/api/health') {
        return next();
      }

      const instanceId = req.headers['x-instance-id'] as string;
      const authToken = req.headers['x-auth-token'] as string;

      // If token provided, validate it
      if (authToken && config.authToken && authToken !== config.authToken) {
        this.log('warn', 'Invalid auth token attempt', { ip: req.ip });
        return res.status(401).json({ error: 'Invalid authentication token' });
      }

      // Log instance ID for tracking
      if (instanceId) {
        this.log('debug', `Request from instance: ${instanceId}`);
      }

      next();
    });

    // Built-in health check endpoint
    this.app.get('/api/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
        requestCount: this.requestCount,
      });
    });

    // Endpoint listing endpoint
    this.app.get('/api/endpoints', (req: Request, res: Response) => {
      const endpointList = Array.from(this.endpoints.values()).map(ep => ({
        id: ep.id,
        name: ep.name,
        method: ep.method,
        path: ep.path,
      }));

      res.json({
        endpoints: endpointList,
        count: endpointList.length,
      });
    });

    this.log('info', 'Server initialized', { port: config.port });
  }

  registerEndpoint(endpoint: ApiEndpoint): void {
    if (!this.app) {
      throw new Error('Server not initialized');
    }

    const handler = async (req: Request, res: Response) => {
      try {
        this.log('info', `Endpoint called: ${endpoint.name}`, {
          method: req.method,
          body: req.body,
          query: req.query,
        });

        // For now, return a simple response
        // In the future, this will call user-defined handlers
        res.json({
          success: true,
          endpoint: endpoint.name,
          method: req.method,
          body: req.body,
          query: req.query,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.log('error', `Endpoint error: ${endpoint.name}`, error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };

    const method = endpoint.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
    this.app[method](endpoint.path, handler);

    this.endpoints.set(endpoint.id, endpoint);
    this.log('info', `Endpoint registered: ${endpoint.method} ${endpoint.path} (${endpoint.name})`);
  }

  unregisterEndpoint(endpointId: string): void {
    // Note: Express doesn't support dynamic route removal easily
    // For now, we just remove from our registry
    this.endpoints.delete(endpointId);
    this.log('info', `Endpoint unregistered: ${endpointId}`);
  }

  async start(): Promise<void> {
    if (!this.app || !this.config) {
      throw new Error('Server not initialized');
    }

    const port = this.config.port;
    const appInstance = this.app;

    return new Promise((resolve, reject) => {
      const serverInstance = appInstance.listen(port, '0.0.0.0', () => {
        this.startTime = new Date();
        this.log('info', `Server started on port ${port}`);
        resolve();
      });

      serverInstance.on('error', (error: Error & { code?: string }) => {
        this.log('error', 'Server failed to start', error);
        reject(error);
      });

      this.server = serverInstance;
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          this.startTime = null;
          this.log('info', 'Server stopped');
          resolve();
        });
      } else {
        this.server = null;
        this.startTime = null;
        resolve();
      }
    });
  }

  getStats(): ServerStats {
    return {
      isRunning: this.server !== null,
      port: this.config?.port || 0,
      requestCount: this.requestCount,
      startTime: this.startTime,
      endpoints: Array.from(this.endpoints.keys()),
    };
  }

  getLogs(): LogEntry[] {
    return [...this.logs].reverse(); // Return newest first
  }

  clearLogs(): void {
    this.logs = [];
  }

  private log(level: LogEntry['level'], message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
    };
    this.logs.push(entry);

    // Console output for development
    const color = {
      info: '\x1b[36m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      debug: '\x1b[90m',
    }[level] || '\x1b[0m';

    console.log(`${color}[Server]${'\x1b[0m'} ${level.toUpperCase()}: ${message}`);
  }
}

// Singleton instance
export const serverService = new ServerService();
