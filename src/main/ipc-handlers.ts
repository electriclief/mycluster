import { ipcMain, app } from 'electron';
import { AppConfig } from '@shared/types';
import Store from 'electron-store';

const store = new Store<AppConfig>();

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

    // First launch detection
    ipcMain.handle('app:is-first-launch', (): boolean => {
      return store.size === 0;
    });
  },
};
