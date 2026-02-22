#!/usr/bin/env node
/**
 * MyCluster Server CLI
 * 
 * Standalone server for headless deployment.
 * 
 * Usage:
 *   mycluster-server --port 3000 --data-dir /var/mycluster
 *   mycluster-server -p 8080 -d ./data --storage sqlite
 */

import { Command } from 'commander';
import { MyClusterServer } from './server.js';
import { YamlStorage } from '@mycluster/storage-yaml';
import { SqliteStorage } from '@mycluster/storage-sqlite';
import * as path from 'path';
import * as os from 'os';

const program = new Command();

program
  .name('mycluster-server')
  .description('MyCluster Standalone Server')
  .version('0.1.0')
  .option('-p, --port <number>', 'Server port', '3000')
  .option('-h, --host <string>', 'Server host', '0.0.0.0')
  .option('-d, --data-dir <path>', 'Data directory for storage', path.join(os.homedir(), '.mycluster'))
  .option('-s, --storage <type>', 'Storage type: yaml or sqlite', 'yaml')
  .option('-t, --auth-token <token>', 'Legacy authentication token (deprecated, use auto-generated keys)')
  .option('--cors-origins <origins>', 'CORS allowed origins (comma-separated)', '*')
  .option('--file-storage <enabled>', 'Enable file storage for job results (true/false)', 'true')
  .option('--results-dir <path>', 'Directory for storing result files')
  .option('--file-max-age <days>', 'Maximum age of result files in days', '7')
  .option('--file-max-size <mb>', 'Maximum total size of result files in MB', '1000')
  .option('--security-enabled <enabled>', 'Enable automatic API key authentication (true/false)', 'true')
  .option('--security-auto-keys <enabled>', 'Auto-generate API keys on startup (true/false)', 'true')
  .option('--security-key-expiry <days>', 'API key expiration in days', '365')
  .option('--audit-log-enabled <enabled>', 'Enable audit logging (true/false)', 'true')
  .option('--audit-log-level <level>', 'Audit log level: all, errors, admin', 'all')
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    const host = options.host;
    const dataDir = options.dataDir;
    const storageType = options.storage;
    const authToken = options.authToken;
    const corsOrigins = options.corsOrigins === '*' ? ['*'] : options.corsOrigins.split(',');
    const fileStorageEnabled = options.fileStorage === 'true';
    const resultsDir = options.resultsDir || path.join(dataDir, 'results');
    const fileMaxAge = parseInt(options.fileMaxAge, 10);
    const fileMaxSize = parseInt(options.fileMaxSize, 10);
    const securityEnabled = options.securityEnabled === 'true';
    const securityAutoKeys = options.securityAutoKeys === 'true';
    const securityKeyExpiry = parseInt(options.securityKeyExpiry, 10);
    const auditLogEnabled = options.auditLogEnabled === 'true';
    const auditLogLevel = options.auditLogLevel as 'all' | 'errors' | 'admin';

    console.log('🚀 Starting MyCluster Server...\n');
    console.log(`   Port: ${port}`);
    console.log(`   Host: ${host}`);
    console.log(`   Data Dir: ${dataDir}`);
    console.log(`   Storage: ${storageType}`);
    console.log(`   Auth Token: ${authToken ? '*** (legacy)' : 'none (using auto-keys)'}`);
    console.log(`   CORS Origins: ${corsOrigins.join(', ')}`);
    console.log(`   File Storage: ${fileStorageEnabled ? 'enabled' : 'disabled'}`);
    if (fileStorageEnabled) {
      console.log(`   Results Dir: ${resultsDir}`);
      console.log(`   Max File Age: ${fileMaxAge} days`);
      console.log(`   Max Size: ${fileMaxSize} MB`);
    }
    console.log(`   Security: ${securityEnabled ? 'enabled (auto API keys)' : 'disabled'}`);
    if (securityEnabled) {
      console.log(`   Auto Generate Keys: ${securityAutoKeys}`);
      console.log(`   Key Expiry: ${securityKeyExpiry} days`);
      console.log(`   Audit Logging: ${auditLogEnabled ? auditLogLevel : 'disabled'}`);
    }
    console.log('');

    // Initialize storage
    let storage;
    if (storageType === 'sqlite') {
      console.log('📦 Using SQLite storage...');
      storage = new SqliteStorage({ dataDir });
      await storage.initialize();
    } else {
      console.log('📦 Using YAML storage...');
      storage = new YamlStorage({ dataDir });
    }

    // Create and start server
    const server = new MyClusterServer({
      port,
      host,
      storage,
      corsOrigins,
      authToken,
      dataDir,
      fileStorage: fileStorageEnabled ? {
        enabled: true,
        resultsDir,
        maxAgeDays: fileMaxAge,
        maxSizeMB: fileMaxSize,
      } : {
        enabled: false,
      },
      security: {
        enabled: securityEnabled,
        autoGenerateKeys: securityAutoKeys,
        keyExpirationDays: securityKeyExpiry,
        auditLogEnabled,
        auditLogLevel,
      },
    });

    // Handle shutdown signals
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down...`);
      await server.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    try {
      await server.start();
      console.log('\n✅ Server ready!\n');
      console.log('   Endpoints:');
      console.log(`   - Health: http://${host}:${port}/api/health`);
      console.log(`   - Stats: http://${host}:${port}/api/stats`);
      console.log(`   - Computers: http://${host}:${port}/api/computers`);
      console.log(`   - Jobs: http://${host}:${port}/api/jobs`);
      console.log(`   - Agents: http://${host}:${port}/api/agent/agents`);
      console.log(`   - Results: http://${host}:${port}/api/results`);
      console.log(`   - Security: http://${host}:${port}/api/security`);
      console.log(`   - WebSocket: ws://${host}:${port}/ws`);
      console.log('\n   Press Ctrl+C to stop\n');
    } catch (error) {
      console.error('❌ Failed to start server:', (error as Error).message);
      process.exit(1);
    }
  });

program.parse();
