import { ipcMain, app } from 'electron';
import { AppConfig } from '@shared/types';
import Store from 'electron-store';
import crypto from 'crypto';

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
  },
};
