#!/usr/bin/env node
/**
 * Migration Tool: YAML to SQLite
 * 
 * Migrates existing YAML data to SQLite database.
 * Creates a backup before migration.
 */

import { YamlStorage } from '@mycluster/storage-yaml';
import { SqliteStorage } from '@mycluster/storage-sqlite';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface MigrationOptions {
  dataDir: string;
  backupDir?: string;
}

export async function migrateFromYamlToSqlite(options: MigrationOptions): Promise<{
  success: boolean;
  computersMigrated: number;
  servicesMigrated: number;
  error?: string;
}> {
  const yamlStorage = new YamlStorage({ dataDir: options.dataDir });
  const sqliteStorage = new SqliteStorage({ dataDir: options.dataDir });

  try {
    // Load data from YAML
    console.log('📖 Loading data from YAML...');
    const computers = await yamlStorage.getComputers();
    
    console.log(`   Found ${computers.length} computers`);
    
    let totalServices = 0;
    computers.forEach(c => {
      const serviceCount = c.services?.length || 0;
      totalServices += serviceCount;
    });
    console.log(`   Found ${totalServices} services`);

    // Create backup
    const backupDir = options.backupDir || path.join(options.dataDir, 'backup-' + Date.now());
    console.log(`\n💾 Creating backup at: ${backupDir}`);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const computersFile = path.join(options.dataDir, 'computers.yaml');
    if (fs.existsSync(computersFile)) {
      fs.copyFileSync(computersFile, path.join(backupDir, 'computers.yaml'));
    }
    
    console.log('   Backup complete');

    // Migrate computers
    console.log('\n📦 Migrating computers...');
    let migratedComputers = 0;
    let migratedServices = 0;

    for (const computer of computers) {
      await sqliteStorage.saveComputer(computer);
      migratedComputers++;
      
      if (computer.services) {
        migratedServices += computer.services.length;
      }
      
      process.stdout.write(`\r   Migrated ${migratedComputers}/${computers.length} computers`);
    }
    
    console.log(`\n   ✓ ${migratedComputers} computers migrated`);
    console.log(`   ✓ ${migratedServices} services migrated`);

    // Verify migration
    console.log('\n✅ Verifying migration...');
    const migratedData = await sqliteStorage.getComputers();
    
    if (migratedData.length === computers.length) {
      console.log('   ✓ Computer count matches');
    } else {
      console.warn(`   ⚠ Computer count mismatch: ${migratedData.length} vs ${computers.length}`);
    }

    console.log('\n✨ Migration complete!');
    console.log(`   Backup saved to: ${backupDir}`);
    console.log(`   SQLite database: ${sqliteStorage.getDbPath()}`);

    return {
      success: true,
      computersMigrated: migratedComputers,
      servicesMigrated: migratedServices,
    };

  } catch (error) {
    console.error('❌ Migration failed:', (error as Error).message);
    return {
      success: false,
      computersMigrated: 0,
      servicesMigrated: 0,
      error: (error as Error).message,
    };
  } finally {
    sqliteStorage.close();
  }
}

// CLI execution
if (process.argv[1]?.endsWith('migrate.js')) {
  const dataDir = process.argv[2] || process.env.APPDATA || process.env.HOME || '.';
  
  console.log('🚀 MyCluster YAML to SQLite Migration Tool\n');
  console.log(`Data directory: ${dataDir}`);
  
  migrateFromYamlToSqlite({ dataDir })
    .then(result => {
      if (result.success) {
        console.log('\n✅ Migration successful!');
        process.exit(0);
      } else {
        console.error('\n❌ Migration failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Unexpected error:', error);
      process.exit(1);
    });
}
