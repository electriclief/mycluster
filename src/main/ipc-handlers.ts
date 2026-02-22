import { ipcMain, app } from 'electron';
import { AppConfig, ApiEndpoint } from '@shared/types';
import Store from 'electron-store';
import crypto from 'crypto';
import { serverService } from '../server/server';

const store = new Store<AppConfig>();

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

export const ipcHandlers = {
  register(): void {
    // App info handlers
    ipcMain.handle('app:get-version', () => app.getVersion());
    ipcMain.handle('app:get-platform', () => process.platform);

    // Config handlers
    ipcMain.handle('config:get', (): AppConfig => {
      return store.store as AppConfig;
    });

    ipcMain.handle('config:set', (_event, config: Partial<AppConfig>): void => {
      Object.entries(config).forEach(([key, value]) => {
        store.set(key as keyof AppConfig, value);
      });
    });

    ipcMain.handle('config:get-key', (_event, key: keyof AppConfig): unknown => {
      return store.get(key);
    });

    ipcMain.handle('config:set-key', (_event, key: keyof AppConfig, value: unknown): void => {
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

    ipcMain.handle('server:registerEndpoint', (_event, endpoint: ApiEndpoint): void => {
      serverService.registerEndpoint(endpoint);
    });

    ipcMain.handle('server:unregisterEndpoint', (_event, endpointId: string): void => {
      serverService.unregisterEndpoint(endpointId);
    });
  },
};
