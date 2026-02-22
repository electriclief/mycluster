import { create } from 'zustand';
import { AppConfig } from '@shared/types';

interface AppState {
  // App info
  version: string;
  platform: string;
  isFirstLaunch: boolean | null;

  // Config
  config: AppConfig | null;
  mode: 'server' | 'client' | null;

  // Actions
  setVersion: (version: string) => void;
  setPlatform: (platform: string) => void;
  setIsFirstLaunch: (isFirst: boolean) => void;
  setConfig: (config: AppConfig | null) => void;
  setMode: (mode: 'server' | 'client') => void;
  loadConfig: () => Promise<void>;
  saveConfig: (config: Partial<AppConfig>) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  version: '',
  platform: '',
  isFirstLaunch: null,
  config: null,
  mode: null,

  setVersion: (version) => set({ version }),
  setPlatform: (platform) => set({ platform }),
  setIsFirstLaunch: (isFirst) => set({ isFirstLaunch: isFirst }),
  setConfig: (config) => set({ config, mode: config?.mode ?? null }),
  setMode: (mode) => set({ mode }),

  loadConfig: async () => {
    const config = await window.electronAPI.config.get();
    const isFirst = await window.electronAPI.isFirstLaunch();
    set({ config, mode: config?.mode ?? null, isFirstLaunch: isFirst });
  },

  saveConfig: async (config) => {
    await window.electronAPI.config.set(config);
    const updated = await window.electronAPI.config.get();
    set({ config: updated, mode: updated.mode });
  },
}));
