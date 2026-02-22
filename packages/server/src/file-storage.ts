/**
 * File Storage Manager
 * Handles storage and retrieval of job result files
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface FileInfo {
  filename: string;
  path: string;
  type: string;
  size: number;
  createdAt: string;
  jobId: string;
}

export interface CleanupPolicy {
  maxAgeDays: number;
  maxSizeMB: number;
  enabled: boolean;
}

export class FileStorage extends EventEmitter {
  private resultsDir: string;
  private cleanupPolicy: CleanupPolicy;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: { resultsDir: string; cleanupPolicy?: Partial<CleanupPolicy> }) {
    super();
    this.resultsDir = options.resultsDir;
    this.cleanupPolicy = {
      maxAgeDays: 7,
      maxSizeMB: 1000,
      enabled: true,
      ...options.cleanupPolicy,
    };

    // Ensure results directory exists
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }

    // Start cleanup scheduler if enabled
    if (this.cleanupPolicy.enabled) {
      this.startCleanupScheduler();
    }
  }

  /**
   * Get the directory for a specific job
   */
  getJobDir(jobId: string): string {
    const jobDir = path.join(this.resultsDir, jobId);
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }
    return jobDir;
  }

  /**
   * Save a file for a job
   */
  async saveFile(
    jobId: string,
    filename: string,
    content: Buffer | string,
    fileType: string
  ): Promise<FileInfo> {
    const jobDir = this.getJobDir(jobId);
    const filePath = path.join(jobDir, filename);

    // Ensure directory exists
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }

    // Write file
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    await fs.promises.writeFile(filePath, buffer);

    const stats = await fs.promises.stat(filePath);

    const fileInfo: FileInfo = {
      filename,
      path: filePath,
      type: fileType,
      size: stats.size,
      createdAt: new Date().toISOString(),
      jobId,
    };

    this.emit('file-saved', fileInfo);
    return fileInfo;
  }

  /**
   * Save multiple files for a job
   */
  async saveFiles(
    jobId: string,
    files: Array<{
      filename: string;
      content: Buffer | string;
      type: string;
    }>
  ): Promise<FileInfo[]> {
    const results: FileInfo[] = [];
    for (const file of files) {
      const info = await this.saveFile(jobId, file.filename, file.content, file.type);
      results.push(info);
    }
    return results;
  }

  /**
   * Get a file as buffer
   */
  async getFile(jobId: string, filename: string): Promise<{ buffer: Buffer; fileInfo: FileInfo }> {
    const filePath = path.join(this.resultsDir, jobId, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filename}`);
    }

    const buffer = await fs.promises.readFile(filePath);
    const stats = await fs.promises.stat(filePath);

    const fileInfo: FileInfo = {
      filename,
      path: filePath,
      type: this.getFileType(filename),
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      jobId,
    };

    return { buffer, fileInfo };
  }

  /**
   * Stream a file (for HTTP responses)
   */
  createReadStream(jobId: string, filename: string): fs.ReadStream {
    const filePath = path.join(this.resultsDir, jobId, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filename}`);
    }
    return fs.createReadStream(filePath);
  }

  /**
   * List all files for a job
   */
  async listFiles(jobId: string): Promise<FileInfo[]> {
    const jobDir = this.getJobDir(jobId);

    if (!fs.existsSync(jobDir)) {
      return [];
    }

    const files = await fs.promises.readdir(jobDir);
    const fileInfos: FileInfo[] = [];

    for (const filename of files) {
      const filePath = path.join(jobDir, filename);
      const stats = await fs.promises.stat(filePath);

      fileInfos.push({
        filename,
        path: filePath,
        type: this.getFileType(filename),
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
        jobId,
      });
    }

    return fileInfos;
  }

  /**
   * Delete a job's files
   */
  async deleteJobFiles(jobId: string): Promise<void> {
    const jobDir = this.getJobDir(jobId);

    if (fs.existsSync(jobDir)) {
      await fs.promises.rm(jobDir, { recursive: true, force: true });
      this.emit('files-deleted', { jobId });
    }
  }

  /**
   * Delete a specific file
   */
  async deleteFile(jobId: string, filename: string): Promise<void> {
    const filePath = path.join(this.resultsDir, jobId, filename);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      this.emit('file-deleted', { jobId, filename });
    }
  }

  /**
   * Get total storage used
   */
  async getStorageUsed(): Promise<{ totalBytes: number; totalMB: number; fileCount: number }> {
    let totalBytes = 0;
    let fileCount = 0;

    if (fs.existsSync(this.resultsDir)) {
      const jobDirs = await fs.promises.readdir(this.resultsDir, { withFileTypes: true });

      for (const entry of jobDirs) {
        if (entry.isDirectory()) {
          const jobDir = path.join(this.resultsDir, entry.name);
          const files = await fs.promises.readdir(jobDir);

          for (const filename of files) {
            const filePath = path.join(jobDir, filename);
            const stats = await fs.promises.stat(filePath);
            totalBytes += stats.size;
            fileCount++;
          }
        }
      }
    }

    return {
      totalBytes,
      totalMB: totalBytes / (1024 * 1024),
      fileCount,
    };
  }

  /**
   * Cleanup old files based on policy
   */
  async cleanup(): Promise<{ deletedJobs: string[]; freedBytes: number }> {
    const deletedJobs: string[] = [];
    let freedBytes = 0;
    const now = Date.now();
    const maxAgeMs = this.cleanupPolicy.maxAgeDays * 24 * 60 * 60 * 1000;

    if (!fs.existsSync(this.resultsDir)) {
      return { deletedJobs, freedBytes };
    }

    const jobDirs = await fs.promises.readdir(this.resultsDir, { withFileTypes: true });

    for (const entry of jobDirs) {
      if (entry.isDirectory()) {
        const jobDir = path.join(this.resultsDir, entry.name);
        const jobId = entry.name;

        // Get oldest file in job directory
        const files = await fs.promises.readdir(jobDir);
        if (files.length === 0) continue;

        let oldestTime = now;
        let jobSize = 0;

        for (const filename of files) {
          const filePath = path.join(jobDir, filename);
          const stats = await fs.promises.stat(filePath);
          jobSize += stats.size;
          oldestTime = Math.min(oldestTime, stats.birthtime.getTime());
        }

        // Delete if older than max age
        if (now - oldestTime > maxAgeMs) {
          await fs.promises.rm(jobDir, { recursive: true, force: true });
          deletedJobs.push(jobId);
          freedBytes += jobSize;
          console.log(`🧹 Cleaned up old job: ${jobId} (${(jobSize / 1024).toFixed(2)} KB)`);
        }
      }
    }

    // Also check total size limit
    const storageUsed = await this.getStorageUsed();
    const maxSizeBytes = this.cleanupPolicy.maxSizeMB * 1024 * 1024;

    if (storageUsed.totalBytes > maxSizeBytes) {
      console.log(`⚠️ Storage exceeds limit (${storageUsed.totalMB.toFixed(2)} MB > ${this.cleanupPolicy.maxSizeMB} MB)`);
      // Could implement LRU cleanup here if needed
    }

    this.emit('cleanup', { deletedJobs, freedBytes });
    return { deletedJobs, freedBytes };
  }

  /**
   * Start automatic cleanup scheduler
   */
  private startCleanupScheduler(): void {
    // Run cleanup every 24 hours
    const cleanupIntervalMs = 24 * 60 * 60 * 1000;

    this.cleanupInterval = setInterval(() => {
      console.log('🕐 Running scheduled file cleanup...');
      this.cleanup().catch((err) => {
        console.error('Cleanup error:', err);
      });
    }, cleanupIntervalMs);

    // Also run on startup (after a delay)
    setTimeout(() => {
      this.cleanup().catch((err) => {
        console.error('Startup cleanup error:', err);
      });
    }, 5000);
  }

  /**
   * Stop the cleanup scheduler
   */
  stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Infer file type from extension
   */
  private getFileType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const typeMap: Record<string, string> = {
      '.txt': 'text',
      '.md': 'text',
      '.json': 'text',
      '.csv': 'text',
      '.log': 'text',
      '.png': 'image',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.gif': 'image',
      '.webp': 'image',
      '.bmp': 'image',
      '.svg': 'image',
      '.mp4': 'video',
      '.avi': 'video',
      '.mov': 'video',
      '.webm': 'video',
      '.mp3': 'audio',
      '.wav': 'audio',
      '.ogg': 'audio',
      '.flac': 'audio',
      '.pdf': 'binary',
      '.zip': 'binary',
      '.tar': 'binary',
      '.gz': 'binary',
    };
    return typeMap[ext] || 'binary';
  }

  /**
   * Get MIME type for HTTP response
   */
  static getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.csv': 'text/csv',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
    };
    return mimeMap[ext] || 'application/octet-stream';
  }
}
