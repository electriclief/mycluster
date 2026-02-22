/**
 * SQLite Storage Provider for MyCluster (using sql.js)
 * 
 * Provides persistent storage with concurrency support,
 * transactions, and scalable performance.
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { Computer, Service, Job, StorageProvider } from '@mycluster/core';
import * as path from 'path';
import * as fs from 'fs';

export interface SqliteStorageOptions {
  dataDir: string;
  dbFile?: string;
}

export class SqliteStorage implements StorageProvider {
  private db: SqlJsDatabase | null = null;
  private readonly dbPath: string;
  private initialized: boolean = false;

  constructor(private options: SqliteStorageOptions) {
    this.dbPath = path.join(options.dataDir, options.dbFile || 'mycluster.db');
    
    // Ensure data directory exists
    if (!fs.existsSync(options.dataDir)) {
      fs.mkdirSync(options.dataDir, { recursive: true });
    }
  }

  /**
   * Initialize database (must be called before use)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const SQL = await initSqlJs();
    
    // Try to load existing database
    try {
      if (fs.existsSync(this.dbPath)) {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(fileBuffer);
      } else {
        this.db = new SQL.Database();
      }
      
      this.initializeSchema();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Save database to disk
   */
  private save(): void {
    if (!this.db) return;
    
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  /**
   * Initialize database schema
   */
  private initializeSchema(): void {
    if (!this.db) return;

    this.db.exec(`
      -- Computers table
      CREATE TABLE IF NOT EXISTS computers (
        id TEXT PRIMARY KEY,
        ip_address TEXT NOT NULL,
        computer_name TEXT NOT NULL,
        is_online INTEGER NOT NULL DEFAULT 0,
        last_seen TEXT NOT NULL,
        added_date TEXT NOT NULL
      );

      -- Services table
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        computer_id TEXT NOT NULL REFERENCES computers(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        port INTEGER,
        base_url TEXT,
        config TEXT,  -- JSON
        added_date TEXT NOT NULL,
        last_checked TEXT,
        status TEXT,
        models TEXT  -- JSON array
      );

      -- Jobs table
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        computer_id TEXT REFERENCES computers(id),
        script TEXT NOT NULL,
        args TEXT,  -- JSON
        status TEXT NOT NULL DEFAULT 'pending',
        priority INTEGER NOT NULL DEFAULT 0,
        result TEXT,  -- JSON
        timeout INTEGER,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_services_computer_id ON services(computer_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_computer_id ON jobs(computer_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
    `);
  }

  // ==================== Computer Operations ====================

  async getComputers(): Promise<Computer[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    const computers = this.db.exec('SELECT * FROM computers');
    if (computers.length === 0) return [];

    const columns = computers[0].columns;
    const values = computers[0].values;

    // Load services
    const servicesStmt = this.db.prepare('SELECT * FROM services WHERE computer_id = ?');
    
    return values.map((row: any[]) => {
      const rowObj: any = {};
      columns.forEach((col: string, i: number) => {
        rowObj[col] = row[i];
      });
      
      const computer: Computer = {
        id: rowObj.id,
        ipAddress: rowObj.ip_address,
        computerName: rowObj.computer_name,
        isOnline: rowObj.is_online === 1,
        lastSeen: rowObj.last_seen,
        addedDate: rowObj.added_date,
        services: [],
      };

      // Load services for this computer
      servicesStmt.bind([computer.id]);
      while (servicesStmt.step()) {
        const serviceRow = servicesStmt.getAsObject();
        computer.services!.push(this.rowToService(serviceRow));
      }
      servicesStmt.reset();

      return computer;
    });
  }

  async saveComputer(computer: Computer): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    this.db.run(`
      INSERT OR REPLACE INTO computers (id, ip_address, computer_name, is_online, last_seen, added_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      computer.id,
      computer.ipAddress,
      computer.computerName,
      computer.isOnline ? 1 : 0,
      computer.lastSeen,
      computer.addedDate,
    ]);

    this.save();
  }

  async updateComputer(id: string, updates: Partial<Computer>): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.ipAddress !== undefined) {
      fields.push('ip_address = ?');
      values.push(updates.ipAddress);
    }
    if (updates.computerName !== undefined) {
      fields.push('computer_name = ?');
      values.push(updates.computerName);
    }
    if (updates.isOnline !== undefined) {
      fields.push('is_online = ?');
      values.push(updates.isOnline ? 1 : 0);
    }
    if (updates.lastSeen !== undefined) {
      fields.push('last_seen = ?');
      values.push(updates.lastSeen);
    }

    if (fields.length === 0) return;

    values.push(id);
    this.db.run(`UPDATE computers SET ${fields.join(', ')} WHERE id = ?`, values);
    this.save();
  }

  async deleteComputer(id: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    this.db.run('DELETE FROM computers WHERE id = ?', [id]);
    this.save();
  }

  // ==================== Service Operations ====================

  async addService(computerId: string, service: Omit<Service, 'id' | 'addedDate'>): Promise<Service> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const id = `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const addedDate = new Date().toISOString();

    this.db.run(`
      INSERT INTO services (id, computer_id, type, name, enabled, port, base_url, config, added_date, last_checked, status, models)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      computerId,
      service.type,
      service.name,
      service.enabled ? 1 : 0,
      service.port || null,
      service.baseUrl || null,
      service.config ? JSON.stringify(service.config) : null,
      addedDate,
      service.lastChecked || null,
      service.status || null,
      service.models ? JSON.stringify(service.models) : null,
    ]);

    this.save();

    return {
      ...service,
      id,
      addedDate,
    };
  }

  async removeService(computerId: string, serviceId: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    this.db.run('DELETE FROM services WHERE id = ? AND computer_id = ?', [serviceId, computerId]);
    this.save();
  }

  async updateService(computerId: string, serviceId: string, updates: Partial<Service>): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (fields.length === 0) return;

    values.push(serviceId, computerId);
    this.db.run(`UPDATE services SET ${fields.join(', ')} WHERE id = ? AND computer_id = ?`, values);
    this.save();
  }

  // ==================== Job Operations ====================

  async getJobs(): Promise<Job[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    const result = this.db.exec('SELECT * FROM jobs ORDER BY created_at DESC');
    if (result.length === 0) return [];

    const columns = result[0].columns;
    const values = result[0].values;

    return values.map((row: any[]) => {
      const rowObj: any = {};
      columns.forEach((col: string, i: number) => {
        rowObj[col] = row[i];
      });
      return this.rowToJob(rowObj);
    });
  }

  async saveJob(job: Job): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    this.db.run(`
      INSERT OR REPLACE INTO jobs (id, computer_id, script, args, status, priority, result, timeout, created_at, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      job.id,
      job.targetComputerId,
      job.script,
      job.args ? JSON.stringify(job.args) : null,
      job.status,
      job.priority,
      job.result ? JSON.stringify(job.result) : null,
      job.timeout || null,
      job.createdAt,
      job.startedAt || null,
      job.completedAt || null,
    ]);

    this.save();
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.result !== undefined) {
      fields.push('result = ?');
      values.push(JSON.stringify(updates.result));
    }
    if (updates.startedAt !== undefined) {
      fields.push('started_at = ?');
      values.push(updates.startedAt);
    }
    if (updates.completedAt !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completedAt);
    }

    if (fields.length === 0) return;

    values.push(id);
    this.db.run(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`, values);
    this.save();
  }

  async deleteJob(id: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    this.db.run('DELETE FROM jobs WHERE id = ?', [id]);
    this.save();
  }

  // ==================== Helpers ====================

  private rowToService(row: any): Service {
    return {
      id: row.id,
      type: row.type as 'ollama' | 'custom',
      name: row.name,
      enabled: row.enabled === 1,
      port: row.port || undefined,
      baseUrl: row.base_url || undefined,
      config: row.config ? JSON.parse(row.config) : undefined,
      addedDate: row.added_date,
      lastChecked: row.last_checked || undefined,
      status: row.status as 'online' | 'offline' | 'error' || undefined,
      models: row.models ? JSON.parse(row.models) : undefined,
    };
  }

  private rowToJob(row: any): Job {
    return {
      id: row.id,
      script: row.script,
      targetComputerId: row.computer_id,
      args: row.args ? JSON.parse(row.args) : undefined,
      status: row.status as any,
      priority: row.priority,
      result: row.result ? JSON.parse(row.result) : undefined,
      timeout: row.timeout || undefined,
      createdAt: row.created_at,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined,
    };
  }

  /**
   * Close database
   */
  close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * Get database path
   */
  getDbPath(): string {
    return this.dbPath;
  }
}
