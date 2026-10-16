import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { DEFAULT_API_KEY } from '../ai/openrouter';
import type { AdjustmentPreset, ExportPreset } from '../editor/types';

const isNative = Capacitor.isNativePlatform();

const API_KEY_STORAGE = 'openrouter_api_key';
const CONVERSATION_KEY = 'assistant_conversation';
const SETTINGS_KEY = 'app_settings';
const PROJECT_PREFIX = 'project:';
const PRESET_PREFIX = 'preset:';

export async function hasStoredApiKey(): Promise<boolean> {
  if (isNative) {
    try {
      const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
      const result = await SecureStoragePlugin.get({ key: API_KEY_STORAGE });
      return Boolean(result.value);
    } catch {
      return false;
    }
  }
  return Boolean(localStorage.getItem(API_KEY_STORAGE));
}

export async function saveApiKey(key: string): Promise<void> {
  if (isNative) {
    const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
    await SecureStoragePlugin.set({ key: API_KEY_STORAGE, value: key });
  } else {
    localStorage.setItem(API_KEY_STORAGE, key);
  }
}

export async function getApiKey(): Promise<string> {
  if (isNative) {
    try {
      const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
      const result = await SecureStoragePlugin.get({ key: API_KEY_STORAGE });
      return result.value ?? DEFAULT_API_KEY;
    } catch {
      return DEFAULT_API_KEY;
    }
  }
  return localStorage.getItem(API_KEY_STORAGE) ?? DEFAULT_API_KEY;
}

export async function deleteApiKey(): Promise<void> {
  if (isNative) {
    const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
    await SecureStoragePlugin.remove({ key: API_KEY_STORAGE });
  } else {
    localStorage.removeItem(API_KEY_STORAGE);
  }
}

/* ============================================================================
   TIER 1 — Adjustment Preset persistence
   ============================================================================ */

export async function savePreset(preset: AdjustmentPreset): Promise<void> {
  const json = JSON.stringify(preset);
  if (isNative) {
    await Preferences.set({ key: `${PRESET_PREFIX}${preset.id}`, value: json });
  } else {
    localStorage.setItem(`${PRESET_PREFIX}${preset.id}`, json);
  }
}

export async function loadPresets(): Promise<AdjustmentPreset[]> {
  const presets: AdjustmentPreset[] = [];
  if (isNative) {
    try {
      const result = await Preferences.keys();
      for (const key of result.keys) {
        if (key.startsWith(PRESET_PREFIX)) {
          const value = await Preferences.get({ key });
          if (value.value) {
            try {
              presets.push(JSON.parse(value.value) as AdjustmentPreset);
            } catch {
              // ignore corrupt entries
            }
          }
        }
      }
    } catch {
      // ignore
    }
  } else {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PRESET_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            presets.push(JSON.parse(value) as AdjustmentPreset);
          } catch {
            // ignore corrupt entries
          }
        }
      }
    }
  }
  return presets.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deletePreset(id: string): Promise<void> {
  if (isNative) {
    try {
      await Preferences.remove({ key: `${PRESET_PREFIX}${id}` });
    } catch {
      // ignore
    }
  } else {
    localStorage.removeItem(`${PRESET_PREFIX}${id}`);
  }
}

/* ============================================================================
   TIER 5 — Export Preset persistence
   ============================================================================ */

const EXPORT_PRESET_PREFIX = 'export_preset:';

export async function saveExportPreset(preset: ExportPreset): Promise<void> {
  const json = JSON.stringify(preset);
  if (isNative) {
    await Preferences.set({ key: `${EXPORT_PRESET_PREFIX}${preset.id}`, value: json });
  } else {
    localStorage.setItem(`${EXPORT_PRESET_PREFIX}${preset.id}`, json);
  }
}

export async function loadExportPresets(): Promise<ExportPreset[]> {
  const presets: ExportPreset[] = [];
  if (isNative) {
    try {
      const result = await Preferences.keys();
      for (const key of result.keys) {
        if (key.startsWith(EXPORT_PRESET_PREFIX)) {
          const value = await Preferences.get({ key });
          if (value.value) {
            try {
              presets.push(JSON.parse(value.value) as ExportPreset);
            } catch {
              // ignore corrupt entries
            }
          }
        }
      }
    } catch {
      // ignore
    }
  } else {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(EXPORT_PRESET_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            presets.push(JSON.parse(value) as ExportPreset);
          } catch {
            // ignore corrupt entries
          }
        }
      }
    }
  }
  return presets.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteExportPreset(id: string): Promise<void> {
  if (isNative) {
    try {
      await Preferences.remove({ key: `${EXPORT_PRESET_PREFIX}${id}` });
    } catch {
      // ignore
    }
  } else {
    localStorage.removeItem(`${EXPORT_PRESET_PREFIX}${id}`);
  }
}

export async function saveConversation(messages: unknown[]): Promise<void> {
  const json = JSON.stringify(messages);
  if (isNative) {
    await Preferences.set({ key: CONVERSATION_KEY, value: json });
  } else {
    localStorage.setItem(CONVERSATION_KEY, json);
  }
}

export async function loadConversation<T>(): Promise<T[] | null> {
  let json: string | null;
  if (isNative) {
    const result = await Preferences.get({ key: CONVERSATION_KEY });
    json = result.value ?? null;
  } else {
    json = localStorage.getItem(CONVERSATION_KEY);
  }
  if (!json) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    return parsed as T[];
  } catch {
    return null;
  }
}

export interface AppSettings {
  model: string;
  visionEnabled: boolean;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const json = JSON.stringify(settings);
  if (isNative) {
    await Preferences.set({ key: SETTINGS_KEY, value: json });
  } else {
    localStorage.setItem(SETTINGS_KEY, json);
  }
}

export async function loadSettings(): Promise<AppSettings | null> {
  let json: string | null;
  if (isNative) {
    const result = await Preferences.get({ key: SETTINGS_KEY });
    json = result.value ?? null;
  } else {
    json = localStorage.getItem(SETTINGS_KEY);
  }
  if (!json) return null;
  try {
    return JSON.parse(json) as AppSettings;
  } catch {
    return null;
  }
}

export async function saveProjectJson(name: string, json: string): Promise<void> {
  if (isNative) {
    await Filesystem.writeFile({
      path: `projects/${name}.json`,
      data: json,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
  } else {
    localStorage.setItem(`${PROJECT_PREFIX}${name}`, json);
  }
}

export async function deleteProjectJson(name: string): Promise<void> {
  if (isNative) {
    try {
      await Filesystem.deleteFile({
        path: `projects/${name}.json`,
        directory: Directory.Data,
      });
    } catch {
      // ignore missing files
    }
  } else {
    localStorage.removeItem(`${PROJECT_PREFIX}${name}`);
  }
}

export async function loadProjectJson(name: string): Promise<string | null> {
  if (isNative) {
    try {
      const result = await Filesystem.readFile({
        path: `projects/${name}.json`,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      return result.data as string;
    } catch {
      return null;
    }
  }
  return localStorage.getItem(`${PROJECT_PREFIX}${name}`);
}

export async function listProjectNames(): Promise<string[]> {
  if (isNative) {
    try {
      const result = await Filesystem.readdir({
        path: 'projects',
        directory: Directory.Data,
      });
      const entries = (result as unknown as { entries: Array<{ name: string }> }).entries;
      return entries
        .filter((entry) => entry.name.endsWith('.json'))
        .map((entry) => entry.name.slice(0, -'.json'.length));
    } catch {
      return [];
    }
  }
  const names: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PROJECT_PREFIX)) {
      names.push(key.slice(PROJECT_PREFIX.length));
    }
  }
  return names;
}
