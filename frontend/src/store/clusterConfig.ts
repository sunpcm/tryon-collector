import { create } from 'zustand';
import type { ClusterConfig, Role } from '@/types';

const STORAGE_KEY = 'tryon_cluster_config';

interface StoredConfig {
  groupKeyRegex?: string; // stored as string, converted to RegExp on load
  roleKeywords?: Record<Role, string[]>;
}

function loadConfig(): ClusterConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const stored: StoredConfig = JSON.parse(raw);
    return {
      groupKeyRegex: stored.groupKeyRegex
        ? new RegExp(stored.groupKeyRegex)
        : undefined,
      roleKeywords: stored.roleKeywords,
    };
  } catch {
    return {};
  }
}

function saveConfig(config: ClusterConfig) {
  const stored: StoredConfig = {
    groupKeyRegex: config.groupKeyRegex?.source,
    roleKeywords: config.roleKeywords,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

interface ClusterConfigState {
  config: ClusterConfig;
  setGroupKeyRegex: (pattern: string) => void;
  resetToDefault: () => void;
}

export const useClusterConfigStore = create<ClusterConfigState>(set => ({
  config: loadConfig(),

  setGroupKeyRegex: (pattern: string) => {
    try {
      const regex = new RegExp(pattern);
      const config: ClusterConfig = { groupKeyRegex: regex };
      saveConfig(config);
      set({ config });
    } catch {
      // Invalid regex, don't update
    }
  },

  resetToDefault: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ config: {} });
  },
}));
