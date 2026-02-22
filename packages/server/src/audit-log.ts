/**
 * Audit Logging Middleware
 * 
 * Logs all API requests with authentication context.
 */

import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface AuditLogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  ipAddress: string;
  userAgent?: string;
  apiKey?: string;
  apiKeyName?: string;
  userId?: string;
  action: string;
  resource: string;
  success: boolean;
  errorMessage?: string;
}

export interface AuditLogConfig {
  logDir: string;
  enabled: boolean;
  maxAgeDays: number;
  logLevel: 'all' | 'errors' | 'admin';
}

export class AuditLogger extends EventEmitter {
  private config: AuditLogConfig;
  private logFile: string;
  private buffer: AuditLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: AuditLogConfig) {
    super();
    this.config = {
      ...config,
      enabled: config.enabled !== false,
      maxAgeDays: config.maxAgeDays || 30,
      logLevel: config.logLevel || 'all',
    };

    // Ensure log directory exists
    if (!fs.existsSync(config.logDir)) {
      fs.mkdirSync(config.logDir, { recursive: true });
    }

    this.logFile = path.join(config.logDir, this.getLogFileName());

    // Start flush interval (write every 5 seconds)
    this.startFlushInterval();

    // Flush on process exit
    process.on('exit', () => this.flush());
    process.on('SIGINT', () => this.flush());
    process.on('SIGTERM', () => this.flush());
  }

  /**
   * Express middleware for audit logging
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const apiKey = req.headers['x-api-key'] as string | undefined;
      const apiKeyName = apiKey ? apiKey.split('_')[0] : undefined;

      // Log after response is finished
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const entry: AuditLogEntry = {
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          ipAddress: this.getClientIp(req),
          userAgent: req.headers['user-agent'],
          apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : undefined,
          apiKeyName,
          action: this.extractAction(req),
          resource: this.extractResource(req),
          success: res.statusCode >= 200 && res.statusCode < 400,
          errorMessage: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : undefined,
        };

        this.log(entry);
      });

      next();
    };
  }

  /**
   * Log an audit entry
   */
  log(entry: AuditLogEntry): void {
    // Check log level filter
    if (this.config.logLevel === 'errors' && entry.success) {
      return;
    }
    if (this.config.logLevel === 'admin' && !entry.apiKeyName) {
      return;
    }

    this.buffer.push(entry);
    this.emit('log', entry);

    // Console output for important events
    if (!entry.success || entry.resource === 'auth' || entry.action === 'delete') {
      const icon = entry.success ? '✅' : '❌';
      console.log(`${icon} [AUDIT] ${entry.method} ${entry.path} - ${entry.statusCode} (${entry.duration}ms)`);
    }

    // Flush if buffer is full
    if (this.buffer.length >= 100) {
      this.flush();
    }
  }

  /**
   * Flush buffer to disk
   */
  flush(): void {
    if (this.buffer.length === 0) return;

    const lines = this.buffer.map(entry => JSON.stringify(entry)).join('\n') + '\n';
    
    try {
      fs.appendFileSync(this.logFile, lines, 'utf-8');
      this.buffer = [];
    } catch (error) {
      console.error('❌ Failed to write audit log:', (error as Error).message);
    }
  }

  /**
   * Get recent audit logs
   */
  async getRecentLogs(limit: number = 100): Promise<AuditLogEntry[]> {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const content = fs.readFileSync(this.logFile, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line);
      
      const entries: AuditLogEntry[] = [];
      for (const line of lines.slice(-limit)) {
        try {
          entries.push(JSON.parse(line));
        } catch {
          // Skip invalid lines
        }
      }
      
      return entries.reverse(); // Most recent first
    } catch (error) {
      console.error('Failed to read audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit log statistics
   */
  async getStats(): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageDuration: number;
    requestsByHour: Record<string, number>;
    topEndpoints: Array<{ path: string; count: number }>;
  }> {
    const logs = await this.getRecentLogs(1000);
    
    const stats = {
      totalRequests: logs.length,
      successfulRequests: logs.filter(l => l.success).length,
      failedRequests: logs.filter(l => !l.success).length,
      averageDuration: 0,
      requestsByHour: {} as Record<string, number>,
      topEndpoints: [] as Array<{ path: string; count: number }>,
    };

    if (logs.length > 0) {
      stats.averageDuration = Math.round(
        logs.reduce((sum, log) => sum + log.duration, 0) / logs.length
      );
    }

    // Requests by hour
    const hourCounts: Record<string, number> = {};
    for (const log of logs) {
      const hour = log.timestamp.slice(0, 13); // YYYY-MM-DDTHH
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
    stats.requestsByHour = hourCounts;

    // Top endpoints
    const pathCounts: Record<string, number> = {};
    for (const log of logs) {
      pathCounts[log.path] = (pathCounts[log.path] || 0) + 1;
    }
    stats.topEndpoints = Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Clean up old audit logs
   */
  async cleanup(): Promise<void> {
    try {
      if (!fs.existsSync(this.logFile)) return;

      const stats = fs.statSync(this.logFile);
      const ageDays = (Date.now() - stats.mtime.getTime()) / (24 * 60 * 60 * 1000);

      if (ageDays > this.config.maxAgeDays) {
        // Rotate log file
        const oldFile = `${this.logFile}.${Date.now()}.old`;
        fs.renameSync(this.logFile, oldFile);
        console.log(`🧹 Rotated old audit log (${ageDays.toFixed(0)} days old)`);
      }
    } catch (error) {
      console.error('Audit log cleanup error:', error);
    }
  }

  /**
   * Stop the audit logger
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 5000);
  }

  private getLogFileName(): string {
    const date = new Date();
    return `audit-${date.toISOString().split('T')[0]}.log`;
  }

  private getClientIp(req: Request): string {
    return (req.headers['x-forwarded-for'] as string) || 
           req.socket.remoteAddress || 
           'unknown';
  }

  private extractAction(req: Request): string {
    if (req.method === 'GET') return 'read';
    if (req.method === 'POST') return 'create';
    if (req.method === 'PUT' || req.method === 'PATCH') return 'update';
    if (req.method === 'DELETE') return 'delete';
    return req.method.toLowerCase();
  }

  private extractResource(req: Request): string {
    const pathParts = req.path.split('/').filter(p => p);
    
    // Handle API routes
    if (pathParts[0] === 'api') {
      return pathParts.slice(1).join('/') || 'root';
    }
    
    return pathParts[0] || 'unknown';
  }
}
