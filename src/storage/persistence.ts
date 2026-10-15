import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { DEFAULT_API_KEY } from '../ai/openrouter';

const isNative = Capacitor.isNativePlatform();

const API_KEY_STORAGE = 'openrouter_api_key';
const CONVERSATION_KEY = 'assistant_conversation';
const SETTINGS_KEY = 'app_settings';
const PROJECT_PREFIX = 'project:';

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
