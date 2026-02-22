/**
 * MyCluster Standalone Server
 * 
 * HTTP server with WebSocket support for real-time updates.
 * Can run headlessly without Electron.
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { createServer, Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { JobQueue, StorageProvider, Computer, Service, Job } from '@mycluster/core';
import { AgentAPI, JobResult } from './agent-api.js';
import { FileStorage } from './file-storage.js';
import { AuthManager } from './auth.js';
import { AuditLogger } from './audit-log.js';
import * as path from 'path';
import * as os from 'os';

export interface ServerOptions {
  port: number;
  host?: string;
  storage: StorageProvider;
  corsOrigins?: string[];
  authToken?: string;
  dataDir?: string;
  fileStorage?: {
    enabled: boolean;
    resultsDir?: string;
    maxAgeDays?: number;
    maxSizeMB?: number;
  };
  security?: {
    enabled?: boolean;
    autoGenerateKeys?: boolean;
    keyExpirationDays?: number;
    auditLogEnabled?: boolean;
    auditLogLevel?: 'all' | 'errors' | 'admin';
  };
}

export interface ServerStats {
  isRunning: boolean;
  port: number;
  uptime: number;
  requestCount: number;
  wsConnections: number;
  agents: {
    total: number;
    online: number;
  };
  jobs: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  computers: {
    total: number;
    online: number;
  };
}

export class MyClusterServer {
  private app: Express | null = null;
  private server: HttpServer | null = null;
  private wsServer: WebSocketServer | null = null;
  private options: ServerOptions;
  private jobQueue: JobQueue;
  private agentAPI: AgentAPI;
  private fileStorage: FileStorage | null = null;
  private authManager: AuthManager | null = null;
  private auditLogger: AuditLogger | null = null;
  private startTime: Date | null = null;
  private requestCount = 0;
  private wsConnections: Set<WebSocket> = new Set();
  private authToken?: string;

  constructor(options: ServerOptions) {
    this.options = {
      host: '0.0.0.0',
      corsOrigins: ['*'],
      ...options,
    };
    this.authToken = options.authToken;

    // Initialize security features
    const securityEnabled = options.security?.enabled !== false; // Default enabled
    
    if (securityEnabled && options.dataDir) {
      this.authManager = new AuthManager({
        dataDir: options.dataDir,
        enabled: securityEnabled,
        autoGenerateKeys: options.security?.autoGenerateKeys !== false,
        keyExpirationDays: options.security?.keyExpirationDays || 365,
      });

      this.auditLogger = new AuditLogger({
        logDir: path.join(options.dataDir, 'logs'),
        enabled: options.security?.auditLogEnabled !== false,
        maxAgeDays: 30,
        logLevel: options.security?.auditLogLevel || 'all',
      });
    }
    
    // Initialize file storage if enabled
    if (options.fileStorage?.enabled) {
      const resultsDir = options.fileStorage.resultsDir || 
        path.join(options.dataDir || os.tmpdir(), 'results');
      
      this.fileStorage = new FileStorage({
        resultsDir,
        cleanupPolicy: {
          maxAgeDays: options.fileStorage.maxAgeDays || 7,
          maxSizeMB: options.fileStorage.maxSizeMB || 1000,
          enabled: true,
        },
      });
      console.log(`📁 File storage enabled: ${resultsDir}`);
    }
    
    this.jobQueue = new JobQueue({
      storage: options.storage,
      maxConcurrent: 5,
      maxRetries: 3,
      jobTimeout: 300000,
    });
    this.agentAPI = new AgentAPI({ fileStorage: this.fileStorage || undefined });

    // Setup job progress notifications
    this.jobQueue.onProgress((progress) => {
      this.broadcastToWS({
        type: 'job-progress',
        payload: progress,
      });
    });
  }

  /**
   * Initialize and start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.app = express();
      
      // Initialize auth manager if enabled
      if (this.authManager) {
        this.authManager.initialize().catch(console.error);
      }
      
      this.setupMiddleware();
      this.setupRoutes();
      this.setupWebSocket();

      this.server = createServer(this.app);
      this.wsServer = new WebSocketServer({ server: this.server, path: '/ws' });

      const port = this.options.port;
      const host = this.options.host;

      this.server.listen(port, host, () => {
        this.startTime = new Date();
        console.log(`🚀 MyCluster Server started on http://${host}:${port}`);
        console.log(`   WebSocket: ws://${host}:${port}/ws`);
        console.log(`   API: http://${host}:${port}/api`);
        
        // Print security info
        if (this.authManager) {
          const serverKey = this.authManager.getServerKey();
          if (serverKey) {
            console.log(`\n🔐 Security enabled`);
            console.log(`   Server API Key: ${serverKey}`);
            console.log(`   (Save this key for agent authentication)`);
          }
        }
        console.log('');
        resolve();
      });

      this.server.on('error', (error: Error & { code?: string }) => {
        console.error('❌ Server failed to start:', error.message);
        reject(error);
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          this.startTime = null;
          this.wsServer?.close();
          
          // Stop audit logger
          if (this.auditLogger) {
            this.auditLogger.stop();
          }
          
          console.log('🛑 Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    if (!this.app) return;

    // CORS
    this.app.use(cors({
      origin: this.options.corsOrigins || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Instance-ID', 'X-Auth-Token', 'X-API-Key'],
    }));

    // Audit logging middleware (if enabled)
    if (this.auditLogger) {
      this.app.use(this.auditLogger.middleware());
    }

    // Request logging
    this.app.use((req: Request, res: Response, next) => {
      this.requestCount++;
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      });
      next();
    });

    // JSON body parser
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.text({ limit: '10mb' }));

    // API Key authentication middleware (automatic)
    this.app.use((req: Request, res: Response, next) => {
      // Skip auth for health check and WebSocket
      if (req.path === '/api/health' || req.path === '/ws') {
        return next();
      }

      // Support multiple auth header formats
      const apiKey = req.headers['x-api-key'] as string | undefined;
      const authToken = req.headers['x-auth-token'] as string | undefined;
      const authHeader = req.headers['authorization'] as string | undefined;
      
      const credentials = apiKey || authToken || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined);

      // If auth manager is enabled and credentials are provided, validate them
      if (this.authManager && credentials) {
        const result = this.authManager.validateApiKey(credentials);
        
        if (!result.valid) {
          return res.status(401).json({ 
            error: 'Authentication failed',
            reason: result.error 
          });
        }
        
        // Attach validated key info to request for audit logging
        (req as any).apiKey = result.apiKey;
      }

      next();
    });
  }

  /**
   * Setup HTTP routes
   */
  private setupRoutes(): void {
    if (!this.app) return;

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
        requestCount: this.requestCount,
      });
    });

    // Server stats
    this.app.get('/api/stats', async (req, res) => {
      res.json(await this.getStats());
    });

    // Computers API
    this.app.get('/api/computers', async (req, res) => {
      const computers = await this.options.storage.getComputers();
      res.json(computers);
    });

    this.app.post('/api/computers', async (req, res) => {
      const computer: Computer = req.body;
      await this.options.storage.saveComputer(computer);
      res.json({ success: true, computer });
    });

    this.app.delete('/api/computers/:id', async (req, res) => {
      await this.options.storage.deleteComputer(req.params.id);
      res.json({ success: true });
    });

    // Services API
    this.app.post('/api/computers/:computerId/services', async (req, res) => {
      const service: Omit<Service, 'id' | 'addedDate'> = req.body;
      const created = await this.options.storage.addService(req.params.computerId, service);
      res.json({ success: true, service: created });
    });

    this.app.delete('/api/computers/:computerId/services/:serviceId', async (req, res) => {
      await this.options.storage.removeService(req.params.computerId, req.params.serviceId);
      res.json({ success: true });
    });

    // Jobs API
    this.app.get('/api/jobs', async (req, res) => {
      const status = req.query.status as string | undefined;
      const jobs = await this.jobQueue.getJobs(status as any);
      res.json(jobs);
    });

    this.app.get('/api/jobs/:id', async (req, res) => {
      const job = await this.jobQueue.getJob(req.params.id);
      if (job) {
        res.json(job);
      } else {
        res.status(404).json({ error: 'Job not found' });
      }
    });

    this.app.post('/api/jobs', async (req, res) => {
      const job: Omit<Job, 'id' | 'status' | 'createdAt'> = req.body;
      const created = await this.jobQueue.enqueue(job);
      res.json({ success: true, job: created });
    });

    this.app.post('/api/jobs/:id/cancel', async (req, res) => {
      await this.jobQueue.cancel(req.params.id);
      res.json({ success: true });
    });

    this.app.get('/api/jobs/stats', async (req, res) => {
      const stats = await this.jobQueue.getStats();
      res.json(stats);
    });

    // Results API (file downloads)
    this.app.get('/api/results/:jobId', async (req, res) => {
      if (!this.fileStorage) {
        return res.status(503).json({ error: 'File storage not configured' });
      }
      try {
        const files = await this.fileStorage.listFiles(req.params.jobId);
        res.json({ success: true, files });
      } catch (error) {
        res.status(500).json({ error: 'Failed to list files' });
      }
    });

    this.app.get('/api/results/:jobId/:filename', async (req, res) => {
      if (!this.fileStorage) {
        return res.status(503).json({ error: 'File storage not configured' });
      }
      try {
        const { buffer, fileInfo } = await this.fileStorage.getFile(
          req.params.jobId,
          req.params.filename
        );
        
        const mimeType = FileStorage.getMimeType(req.params.filename);
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${req.params.filename}"`);
        res.setHeader('Content-Length', fileInfo.size.toString());
        res.send(buffer);
      } catch (error) {
        res.status(404).json({ error: 'File not found' });
      }
    });

    this.app.get('/api/results/:jobId/:filename/download', async (req, res) => {
      if (!this.fileStorage) {
        return res.status(503).json({ error: 'File storage not configured' });
      }
      try {
        const { buffer, fileInfo } = await this.fileStorage.getFile(
          req.params.jobId,
          req.params.filename
        );
        
        const mimeType = FileStorage.getMimeType(req.params.filename);
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
        res.setHeader('Content-Length', fileInfo.size.toString());
        res.send(buffer);
      } catch (error) {
        res.status(404).json({ error: 'File not found' });
      }
    });

    this.app.delete('/api/results/:jobId', async (req, res) => {
      if (!this.fileStorage) {
        return res.status(503).json({ error: 'File storage not configured' });
      }
      try {
        await this.fileStorage.deleteJobFiles(req.params.jobId);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete files' });
      }
    });

    this.app.get('/api/results/stats', async (req, res) => {
      if (!this.fileStorage) {
        return res.status(503).json({ error: 'File storage not configured' });
      }
      try {
        const storageUsed = await this.fileStorage.getStorageUsed();
        res.json({ success: true, ...storageUsed });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get storage stats' });
      }
    });

    // Security API routes
    this.app.get('/api/security/keys', async (req, res) => {
      if (!this.authManager) {
        return res.status(503).json({ error: 'Authentication not configured' });
      }
      const keys = this.authManager.getAllKeys();
      res.json({ success: true, keys });
    });

    this.app.post('/api/security/keys/agent', async (req, res) => {
      if (!this.authManager) {
        return res.status(503).json({ error: 'Authentication not configured' });
      }
      const { agentId } = req.body;
      if (!agentId) {
        return res.status(400).json({ error: 'agentId required' });
      }
      const key = await this.authManager.generateAgentKey(agentId);
      res.json({ success: true, key, agentId });
    });

    this.app.get('/api/security/audit-logs', async (req, res) => {
      if (!this.auditLogger) {
        return res.status(503).json({ error: 'Audit logging not configured' });
      }
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await this.auditLogger.getRecentLogs(limit);
      res.json({ success: true, logs });
    });

    this.app.get('/api/security/audit-stats', async (req, res) => {
      if (!this.auditLogger) {
        return res.status(503).json({ error: 'Audit logging not configured' });
      }
      const stats = await this.auditLogger.getStats();
      res.json({ success: true, stats });
    });

    // Mount Agent API
    this.app.use('/api/agent', this.agentAPI.getRouter());

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  /**
   * Setup WebSocket server for real-time updates
   */
  private setupWebSocket(): void {
    if (!this.wsServer) return;

    this.wsServer.on('connection', (ws: WebSocket) => {
      this.wsConnections.add(ws);
      console.log(`🔌 WebSocket connected (${this.wsConnections.size} total)`);

      ws.on('close', () => {
        this.wsConnections.delete(ws);
        console.log(`🔌 WebSocket disconnected (${this.wsConnections.size} total)`);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.wsConnections.delete(ws);
      });

      // Send initial connection message
      ws.send(JSON.stringify({
        type: 'connected',
        payload: {
          timestamp: new Date().toISOString(),
          serverUptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
        },
      }));
    });
  }

  /**
   * Broadcast message to all WebSocket clients
   */
  private broadcastToWS(message: object): void {
    const data = JSON.stringify(message);
    this.wsConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  /**
   * Get server statistics
   */
  async getStats(): Promise<ServerStats> {
    const agentStats = this.agentAPI.getStats();
    const jobStats = await this.jobQueue.getStats();

    return {
      isRunning: this.server !== null,
      port: this.options.port,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      requestCount: this.requestCount,
      wsConnections: this.wsConnections.size,
      agents: {
        total: agentStats.totalAgents,
        online: agentStats.onlineAgents,
      },
      jobs: {
        pending: jobStats.pending,
        running: jobStats.running,
        completed: jobStats.complete,
        failed: jobStats.failed,
      },
      computers: {
        total: 0, // Would need to query storage
        online: 0,
      },
    };
  }
}
