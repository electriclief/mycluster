import { contextBridge, ipcRenderer } from 'electron';
import { AppConfig } from '@shared/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPlatform: () => ipcRenderer.invoke('app:get-platform'),
  isFirstLaunch: () => ipcRenderer.invoke('app:is-first-launch'),
  getInstanceId: () => ipcRenderer.invoke('app:getInstanceId'),

  // Config
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (config: Partial<AppConfig>) => ipcRenderer.invoke('config:set', config),
    getKey: <K extends keyof AppConfig>(key: K) => ipcRenderer.invoke('config:get-key', key),
    setKey: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) =>
      ipcRenderer.invoke('config:set-key', key, value),
    clear: () => ipcRenderer.invoke('config:clear'),
    export: () => ipcRenderer.invoke('config:export'),
    import: (json: string) => ipcRenderer.invoke('config:import', json),
  },

  // Server control
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
});

// Type declarations for the exposed API
export interface ElectronAPI {
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  isFirstLaunch: () => Promise<boolean>;
  getInstanceId: () => Promise<string>;
  config: {
    get: () => Promise<AppConfig>;
    set: (config: Partial<AppConfig>) => Promise<void>;
    getKey: <K extends keyof AppConfig>(key: K) => Promise<AppConfig[K]>;
    setKey: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => Promise<void>;
    clear: () => Promise<void>;
    export: () => Promise<string>;
    import: (json: string) => Promise<boolean>;
  };
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
}
