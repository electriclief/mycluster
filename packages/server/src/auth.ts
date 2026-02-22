/**
 * Authentication & Authorization Manager
 * 
 * Automatic API key generation and validation.
 * Keys are generated on first startup and persisted.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface ApiKeyInfo {
  key: string;
  name: string;
  type: 'server' | 'agent' | 'gui';
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
  permissions: Permission[];
}

export type Permission = 
  | 'jobs:read'
  | 'jobs:write'
  | 'jobs:cancel'
  | 'computers:read'
  | 'computers:write'
  | 'agents:read'
  | 'agents:write'
  | 'results:read'
  | 'results:write'
  | 'admin';

export interface AuthConfig {
  dataDir: string;
  enabled: boolean;
  autoGenerateKeys: boolean;
  keyExpirationDays?: number;
}

export interface AuthValidationResult {
  valid: boolean;
  apiKey?: ApiKeyInfo;
  error?: string;
}

export class AuthManager {
  private config: AuthConfig;
  private keys: Map<string, ApiKeyInfo> = new Map();
  private keysFile: string;

  constructor(config: AuthConfig) {
    this.config = {
      ...config,
      enabled: config.enabled !== false,
      autoGenerateKeys: config.autoGenerateKeys !== false,
      keyExpirationDays: config.keyExpirationDays || 365,
    };
    this.keysFile = path.join(config.dataDir, 'api-keys.json');
  }

  /**
   * Initialize authentication system
   * Auto-generates keys if enabled
   */
  async initialize(): Promise<void> {
    // Load existing keys
    await this.loadKeys();

    // Auto-generate server key if none exists
    if (this.config.autoGenerateKeys && !this.keys.has('server')) {
      await this.generateServerKey();
    }

    // Clean up expired keys
    await this.cleanupExpiredKeys();
  }

  /**
   * Load API keys from disk
   */
  private async loadKeys(): Promise<void> {
    try {
      if (fs.existsSync(this.keysFile)) {
        const data = fs.readFileSync(this.keysFile, 'utf-8');
        const keysData = JSON.parse(data) as Record<string, ApiKeyInfo>;
        
        for (const [name, info] of Object.entries(keysData)) {
          this.keys.set(name, info);
        }
        
        console.log(`🔑 Loaded ${this.keys.size} API key(s)`);
      }
    } catch (error) {
      console.warn('⚠️  Could not load API keys, will generate new ones:', (error as Error).message);
    }
  }

  /**
   * Save API keys to disk
   */
  private async saveKeys(): Promise<void> {
    try {
      const keysData: Record<string, ApiKeyInfo> = {};
      for (const [name, info] of this.keys.entries()) {
        keysData[name] = info;
      }
      
      fs.writeFileSync(this.keysFile, JSON.stringify(keysData, null, 2), 'utf-8');
      
      // Set restrictive file permissions (Unix only)
      try {
        if (process.platform !== 'win32') {
          fs.chmodSync(this.keysFile, 0o600);
        }
      } catch {
        // Ignore permission errors on Windows
      }
    } catch (error) {
      console.error('❌ Failed to save API keys:', (error as Error).message);
    }
  }

  /**
   * Generate server API key automatically
   */
  private async generateServerKey(): Promise<void> {
    const key = this.generateApiKey();
    const expirationDays = this.config.keyExpirationDays || 365;
    
    const keyInfo: ApiKeyInfo = {
      key,
      name: 'server',
      type: 'server',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString(),
      permissions: ['admin'],
    };
    
    this.keys.set('server', keyInfo);
    await this.saveKeys();
    
    console.log(`🔐 Generated server API key: ${key.substring(0, 12)}...`);
    console.log(`   Expires: ${new Date(keyInfo.expiresAt!).toLocaleDateString()}`);
    console.log(`   Permissions: admin (all)`);
  }

  /**
   * Generate a new API key for an agent
   */
  async generateAgentKey(agentId: string): Promise<string> {
    const key = this.generateApiKey();
    const expirationDays = this.config.keyExpirationDays || 365;
    
    const keyInfo: ApiKeyInfo = {
      key,
      name: `agent_${agentId}`,
      type: 'agent',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString(),
      permissions: [
        'jobs:read',
        'jobs:write',
        'agents:read',
        'agents:write',
        'results:write',
      ],
    };
    
    this.keys.set(`agent_${agentId}`, keyInfo);
    await this.saveKeys();
    
    return key;
  }

  /**
   * Generate a new API key for GUI
   */
  async generateGuiKey(): Promise<string> {
    const key = this.generateApiKey();
    const expirationDays = this.config.keyExpirationDays || 365;
    
    const keyInfo: ApiKeyInfo = {
      key,
      name: 'gui',
      type: 'gui',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString(),
      permissions: [
        'jobs:read',
        'jobs:write',
        'jobs:cancel',
        'computers:read',
        'computers:write',
        'agents:read',
        'results:read',
        'results:write',
      ],
    };
    
    this.keys.set('gui', keyInfo);
    await this.saveKeys();
    
    return key;
  }

  /**
   * Validate an API key
   */
  validateApiKey(apiKey: string): AuthValidationResult {
    if (!this.config.enabled) {
      return { valid: true };
    }

    const keyInfo = this.keys.get(apiKey);
    
    if (!keyInfo) {
      return { valid: false, error: 'Invalid API key' };
    }

    // Check expiration
    if (keyInfo.expiresAt && new Date(keyInfo.expiresAt) < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    // Update last used
    keyInfo.lastUsed = new Date().toISOString();
    this.saveKeys().catch(console.error);

    return { valid: true, apiKey: keyInfo };
  }

  /**
   * Check if a key has a specific permission
   */
  hasPermission(apiKey: string, permission: Permission): boolean {
    const result = this.validateApiKey(apiKey);
    
    if (!result.valid || !result.apiKey) {
      return false;
    }

    // Admin has all permissions
    if (result.apiKey.permissions.includes('admin')) {
      return true;
    }

    return result.apiKey.permissions.includes(permission);
  }

  /**
   * Get all API keys (for admin purposes)
   */
  getAllKeys(): Omit<ApiKeyInfo, 'key'>[] {
    return Array.from(this.keys.values()).map(({ key, ...rest }) => rest);
  }

  /**
   * Get server API key (for display to user)
   */
  getServerKey(): string | undefined {
    return this.keys.get('server')?.key;
  }

  /**
   * Revoke an API key
   */
  async revokeKey(keyName: string): Promise<boolean> {
    if (keyName === 'server') {
      // Can't revoke server key, generate new one instead
      return false;
    }
    
    const deleted = this.keys.delete(keyName);
    if (deleted) {
      await this.saveKeys();
    }
    return deleted;
  }

  /**
   * Clean up expired keys
   */
  private async cleanupExpiredKeys(): Promise<void> {
    const now = new Date();
    let cleaned = 0;
    
    for (const [name, info] of this.keys.entries()) {
      if (info.expiresAt && new Date(info.expiresAt) < now) {
        this.keys.delete(name);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired API key(s)`);
      await this.saveKeys();
    }
  }

  /**
   * Generate a cryptographically secure API key
   */
  private generateApiKey(): string {
    return `mc_${crypto.randomBytes(24).toString('hex')}`;
  }

  /**
   * Get authentication stats
   */
  getStats(): {
    totalKeys: number;
    serverKeyExists: boolean;
    agentKeys: number;
    guiKeys: number;
    expiredKeys: number;
  } {
    const now = new Date();
    const expiredKeys = Array.from(this.keys.values()).filter(
      info => info.expiresAt && new Date(info.expiresAt) < now
    ).length;

    return {
      totalKeys: this.keys.size,
      serverKeyExists: this.keys.has('server'),
      agentKeys: Array.from(this.keys.values()).filter(k => k.type === 'agent').length,
      guiKeys: Array.from(this.keys.values()).filter(k => k.type === 'gui').length,
      expiredKeys,
    };
  }
}
