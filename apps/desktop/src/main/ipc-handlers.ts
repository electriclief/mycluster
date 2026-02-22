import { ipcMain, app } from 'electron';
import { Computer, Service, StorageProvider, JobQueue, Job, JobStatus } from '@mycluster/core';
import { YamlStorage } from '@mycluster/storage-yaml';
import { ping, scanIpRange, checkOllama, autoDetectServices, addComputerWithAutoDetect as coreAddComputerWithAutoDetect } from '@mycluster/core';
import Store from 'electron-store';
import crypto from 'crypto';
import { serverService } from '../server/server';

const store = new Store<{
  instanceId?: string;
  authToken?: string;
  mode?: 'server' | 'client';
  serverPort?: number;
  allowedOrigins?: string[];
}>();

// Extend app type for isQuiting property
declare global {
  // eslint-disable-next-line no-var
  var __APP_IS_QUITING: boolean;
}

// Generate a unique instance ID and auth token on first launch
function ensureInstanceIdentity(): void {
  if (!store.get('instanceId')) {
    store.set('instanceId', crypto.randomUUID());
  }
  if (!store.get('authToken')) {
    store.set('authToken', crypto.randomUUID());
  }
}

ensureInstanceIdentity();

// Initialize storage and job queue
const dataDir = app.getPath('userData');
const storage: StorageProvider = new YamlStorage({ dataDir });
const jobQueue = new JobQueue({ 
  storage, 
  maxConcurrent: 3, 
  maxRetries: 3, 
  jobTimeout: 300000 
});

export const ipcHandlers = {
  register(): void {
    // App info handlers
    ipcMain.handle('app:get-version', () => app.getVersion());
    ipcMain.handle('app:get-platform', () => process.platform);

    // Config handlers
    ipcMain.handle('config:get', (): typeof store.store => {
      return store.store;
    });

    ipcMain.handle('config:set', (_event, config: Partial<typeof store.store>): void => {
      Object.entries(config).forEach(([key, value]) => {
        store.set(key as keyof typeof store.store, value);
      });
    });

    ipcMain.handle('config:get-key', (_event, key: string): unknown => {
      return store.get(key);
    });

    ipcMain.handle('config:set-key', (_event, key: string, value: unknown): void => {
      store.set(key, value);
    });

    ipcMain.handle('config:clear', (): void => {
      store.clear();
    });

    ipcMain.handle('config:export', (): string => {
      return JSON.stringify(store.store, null, 2);
    });

    ipcMain.handle('config:import', (_event, json: string): boolean => {
      try {
        const config = JSON.parse(json);
        store.set(config);
        return true;
      } catch {
        return false;
      }
    });

    // First launch detection
    ipcMain.handle('app:is-first-launch', (): boolean => {
      return store.size === 0 || (!store.get('mode'));
    });

    // Get instance identity
    ipcMain.handle('app:getInstanceId', (): string => {
      return store.get('instanceId') || '';
    });

    // Quit app
    ipcMain.handle('app:quit', (): void => {
      global.__APP_IS_QUITING = true;
      app.quit();
    });

    // Server control handlers
    ipcMain.handle('server:start', async (): Promise<{ success: boolean; error?: string }> => {
      try {
        const config = store.store;
        serverService.initialize({
          port: config.serverPort || 3000,
          allowedOrigins: config.allowedOrigins || ['*'],
          authToken: config.authToken,
        });
        await serverService.start();
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('server:stop', async (): Promise<void> => {
      await serverService.stop();
    });

    ipcMain.handle('server:getStats', (): unknown => {
      return serverService.getStats();
    });

    ipcMain.handle('server:getLogs', (): unknown => {
      return serverService.getLogs();
    });

    ipcMain.handle('server:clearLogs', (): void => {
      serverService.clearLogs();
    });

    ipcMain.handle('server:registerEndpoint', (_event, endpoint: { id: string; name: string; path: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; handler: string }): void => {
      serverService.registerEndpoint(endpoint);
    });

    ipcMain.handle('server:unregisterEndpoint', (_event, endpointId: string): void => {
      serverService.unregisterEndpoint(endpointId);
    });

    // LAN Discovery handlers - using @mycluster/core
    ipcMain.handle('lan:scan', async (_event, options: {
      baseIp: string;
      start: number;
      end: number;
    }): Promise<{ ip: string; isOnline: boolean }[]> => {
      return scanIpRange(options.baseIp, options.start, options.end);
    });

    ipcMain.handle('lan:getComputers', (): Promise<Computer[]> => {
      return storage.getComputers();
    });

    ipcMain.handle('lan:addComputer', (_event, computer: Omit<Computer, 'id' | 'addedDate' | 'services'>): Promise<Computer> => {
      return coreAddComputerWithAutoDetect(computer, storage).then(r => r.computer);
    });

    ipcMain.handle('lan:addComputerWithAutoDetect', async (_event, computer: Omit<Computer, 'id' | 'addedDate' | 'services'>): Promise<{
      computer: Computer;
      detectedServices: unknown[];
    }> => {
      return coreAddComputerWithAutoDetect(computer, storage);
    });

    ipcMain.handle('lan:removeComputer', (_event, id: string): Promise<void> => {
      return storage.deleteComputer(id);
    });

    ipcMain.handle('lan:updateComputer', (_event, id: string, updates: Partial<Computer>): Promise<void> => {
      return storage.updateComputer(id, updates);
    });

    ipcMain.handle('lan:ping', (_event, ip: string): Promise<boolean> => {
      return ping(ip);
    });

    // Service management handlers
    ipcMain.handle('lan:addService', (_event, computerId: string, service: Omit<Service, 'id' | 'addedDate'>): Promise<Service> => {
      return storage.addService(computerId, service);
    });

    ipcMain.handle('lan:removeService', (_event, computerId: string, serviceId: string): Promise<void> => {
      return storage.removeService(computerId, serviceId);
    });

    ipcMain.handle('lan:updateService', (_event, computerId: string, serviceId: string, updates: Partial<Service>): Promise<void> => {
      return storage.updateService(computerId, serviceId, updates);
    });

    // Ollama detection handler
    ipcMain.handle('lan:checkOllama', (_event, baseUrl: string): Promise<{
      available: boolean;
      models?: string[];
      error?: string;
    }> => {
      return checkOllama(baseUrl);
    });

    // Job Queue handlers
    ipcMain.handle('job:enqueue', async (_event, job: Omit<Job, 'id' | 'status' | 'createdAt'>): Promise<Job> => {
      return jobQueue.enqueue(job);
    });

    ipcMain.handle('job:get', async (_event, id: string): Promise<Job | undefined> => {
      return jobQueue.getJob(id);
    });

    ipcMain.handle('job:list', async (_event, status?: JobStatus): Promise<Job[]> => {
      return jobQueue.getJobs(status);
    });

    ipcMain.handle('job:cancel', async (_event, id: string): Promise<void> => {
      return jobQueue.cancel(id);
    });

    ipcMain.handle('job:stats', async (): Promise<{
      total: number;
      pending: number;
      running: number;
      complete: number;
      failed: number;
      cancelled: number;
    }> => {
      return jobQueue.getStats();
    });

    ipcMain.handle('job:cleanup', async (_event, maxAgeHours?: number): Promise<number> => {
      return jobQueue.cleanupOldJobs(maxAgeHours);
    });
  },
};
