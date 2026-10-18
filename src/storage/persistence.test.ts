import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock localStorage since it's a browser API not available in Node.js
const localStorageMock: Record<string, string> = {};

beforeEach(() => {
  Object.keys(localStorageMock).forEach((key) => delete localStorageMock[key]);
});

afterEach(() => {
  Object.keys(localStorageMock).forEach((key) => delete localStorageMock[key]);
});

vi.stubGlobal('localStorage', {
  get length() {
    return Object.keys(localStorageMock).length;
  },
  getItem: (key: string) => localStorageMock[key] ?? null,
  setItem: (key: string, value: string) => {
    localStorageMock[key] = value;
  },
  removeItem: (key: string) => {
    delete localStorageMock[key];
  },
  clear: () => {
    Object.keys(localStorageMock).forEach((key) => delete localStorageMock[key]);
  },
  key: (index: number) => Object.keys(localStorageMock)[index] ?? null,
} );

vi.stubGlobal('Capacitor', { isNativePlatform: () => false });

import {
  deleteApiKey,
  deleteExportPreset,
  deletePreset,
  deleteProjectJson,
  getApiKey,
  hasStoredApiKey,
  loadConversation,
  loadExportPresets,
  loadPresets,
  loadProjectJson,
  loadSettings,
  listProjectNames,
  saveApiKey,
  saveConversation,
  saveExportPreset,
  savePreset,
  saveSettings,
  saveProjectJson,
} from './persistence';

describe('API key persistence', () => {
  it('returns false when no key is stored', async () => {
    expect(await hasStoredApiKey()).toBe(false);
  });

  it('saves and retrieves an API key', async () => {
    await saveApiKey('sk-test-key-123');
    expect(await hasStoredApiKey()).toBe(true);
    expect(await getApiKey()).toBe('sk-test-key-123');
  });

  it('deletes an API key', async () => {
    await saveApiKey('sk-test-key-123');
    await deleteApiKey();
    expect(await hasStoredApiKey()).toBe(false);
    expect(await getApiKey()).toBe('YOUR_OPENROUTER_API_KEY');
  });

  it('persists across calls in localStorage', async () => {
    await saveApiKey('key-1');
    expect(localStorageMock['openrouter_api_key']).toBe('key-1');
    expect(await getApiKey()).toBe('key-1');
  });
});

describe('Conversation persistence', () => {
  it('returns null when no conversation is stored', async () => {
    expect(await loadConversation()).toBeNull();
  });

  it('saves and loads conversation messages', async () => {
    const messages = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there!' },
    ];
    await saveConversation(messages);
    const loaded = await loadConversation<{ role: string; content: string }>();
    expect(loaded).toHaveLength(2);
    expect(loaded![0].role).toBe('user');
    expect(loaded![0].content).toBe('Hello');
    expect(loaded![1].role).toBe('assistant');
    expect(loaded![1].content).toBe('Hi there!');
  });

  it('handles corrupted JSON gracefully', async () => {
    localStorageMock['assistant_conversation'] = 'not-valid-json';
    expect(await loadConversation()).toBeNull();
  });
});

describe('Settings persistence', () => {
  it('returns null when no settings are stored', async () => {
    expect(await loadSettings()).toBeNull();
  });

  it('saves and loads settings', async () => {
    await saveSettings({ model: 'test/model', visionEnabled: false });
    const settings = await loadSettings();
    expect(settings).toEqual({ model: 'test/model', visionEnabled: false });
  });

  it('persists settings in localStorage', async () => {
    await saveSettings({ model: 'gpt-4o', visionEnabled: true });
    const raw = localStorageMock['app_settings'];
    expect(raw).toBeDefined();
    expect(JSON.parse(raw)).toEqual({ model: 'gpt-4o', visionEnabled: true });
  });
});

describe('Adjustment preset persistence', () => {
  const preset = {
    id: 'my-preset',
    name: 'My Preset',
    adjustments: { brightness: 10, contrast: 5, saturation: 0, hue: 0, temperature: 0 },
    createdAt: 1234567890,
  };

  it('returns empty list when no presets exist', async () => {
    expect(await loadPresets()).toEqual([]);
  });

  it('saves and loads a preset', async () => {
    await savePreset(preset);
    const presets = await loadPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0].id).toBe('my-preset');
    expect(presets[0].name).toBe('My Preset');
    expect(presets[0].adjustments.brightness).toBe(10);
  });

  it('sorts presets by createdAt descending', async () => {
    await savePreset({ ...preset, id: 'a', createdAt: 1000 });
    await savePreset({ ...preset, id: 'b', createdAt: 2000 });
    await savePreset({ ...preset, id: 'c', createdAt: 1500 });
    const presets = await loadPresets();
    expect(presets.map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });

  it('deletes a preset', async () => {
    await savePreset(preset);
    expect((await loadPresets()).length).toBe(1);
    await deletePreset('my-preset');
    expect(await loadPresets()).toEqual([]);
  });

  it('ignores corrupt preset entries', async () => {
    localStorageMock['preset:bad'] = 'not-json';
    await savePreset(preset);
    const presets = await loadPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0].id).toBe('my-preset');
  });
});

describe('Export preset persistence', () => {
  const preset = {
    id: 'export-1',
    name: 'Web Optimized',
    format: 'jpeg' as const,
    quality: 0.85,
    maxWidth: 2048,
    maxHeight: null,
    watermark: null,
    createdAt: 1234567890,
  };

  it('returns empty list when no export presets exist', async () => {
    expect(await loadExportPresets()).toEqual([]);
  });

  it('saves and loads an export preset', async () => {
    await saveExportPreset(preset);
    const presets = await loadExportPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0].id).toBe('export-1');
    expect(presets[0].format).toBe('jpeg');
    expect(presets[0].quality).toBe(0.85);
  });

  it('deletes an export preset', async () => {
    await saveExportPreset(preset);
    await deleteExportPreset('export-1');
    expect(await loadExportPresets()).toEqual([]);
  });
});

describe('Project persistence', () => {
  const projectName = 'my-project';
  const projectJson = JSON.stringify({
    name: projectName,
    sourceImage: 'data:image/png;base64,abc',
    snapshot: {
      adjustments: { brightness: 0, contrast: 0, saturation: 0, hue: 0, temperature: 0 },
      filter: 'none',
      transform: { rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1 },
      crop: null,
    },
  });

  it('returns null when no project exists', async () => {
    expect(await loadProjectJson(projectName)).toBeNull();
  });

  it('saves and loads a project', async () => {
    await saveProjectJson(projectName, projectJson);
    const loaded = await loadProjectJson(projectName);
    expect(loaded).toBe(projectJson);
  });

  it('lists project names', async () => {
    expect(await listProjectNames()).toEqual([]);
    await saveProjectJson('project-a', '{}');
    await saveProjectJson('project-b', '{}');
    const names = await listProjectNames();
    expect(names).toContain('project-a');
    expect(names).toContain('project-b');
    expect(names.length).toBe(2);
  });

  it('deletes a project', async () => {
    await saveProjectJson(projectName, projectJson);
    expect(await listProjectNames()).toContain(projectName);
    await deleteProjectJson(projectName);
    expect(await listProjectNames()).toEqual([]);
    expect(await loadProjectJson(projectName)).toBeNull();
  });

  it('handles missing project file gracefully', async () => {
    expect(await loadProjectJson('nonexistent')).toBeNull();
  });
});
