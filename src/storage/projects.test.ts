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

import { deleteProject, listProjects, loadProject, saveProject } from './projects';
describe('saveProject', () => {
  it('saves a project with default snapshot', async () => {
    const project = await saveProject('my-project', 'data:image/png;base64,abc');
    expect(project.name).toBe('my-project');
    expect(project.sourceImage).toBe('data:image/png;base64,abc');
    expect(project.createdAt).toBe(project.updatedAt);
    expect(project.snapshot.filter).toBe('none');
    expect(project.snapshot.adjustments.brightness).toBe(0);
  });

  it('trims project name', async () => {
    const project = await saveProject('  my-project  ', 'data:image/png;base64,abc');
    expect(project.name).toBe('my-project');
  });

  it('preserves createdAt when updating existing project', async () => {
    const first = await saveProject('proj', 'data:image/png;base64,first', {
      adjustments: { brightness: 10, contrast: 0, saturation: 0, hue: 0, temperature: 0 },
      filter: 'none',
      transform: { rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1 },
      crop: null,
    });
    const createdAt = first.createdAt;

    // Simulate a small time gap
    await new Promise((r) => setTimeout(r, 10));

    const second = await saveProject('proj', 'data:image/png;base64,second');
    expect(second.createdAt).toBe(createdAt);
    expect(second.updatedAt).toBeGreaterThan(first.updatedAt);
    expect(second.sourceImage).toBe('data:image/png;base64,second');
  });

  it('uses provided snapshot', async () => {
    const snapshot = {
      adjustments: { brightness: 20, contrast: 10, saturation: 5, hue: 0, temperature: 0 },
      filter: 'sepia' as const,
      transform: { rotation: 90, flipX: true, flipY: false, scaleX: 1.5, scaleY: 1.5 },
      crop: { x: 10, y: 20, width: 100, height: 100, aspect: 1 },
    };
    const project = await saveProject('snapshot-proj', 'data:image/png;base64,xyz', snapshot);
    expect(project.snapshot.filter).toBe('sepia');
    expect(project.snapshot.adjustments.brightness).toBe(20);
    expect(project.snapshot.transform.rotation).toBe(90);
    expect(project.snapshot.transform.flipX).toBe(true);
    expect(project.snapshot.crop).toEqual({
      x: 10, y: 20, width: 100, height: 100, aspect: 1,
    });
  });

  it('registers new project in index', async () => {
    await saveProject('proj-a', 'data:image/png;base64,a');
    const names = await listProjects();
    expect(names.map((p) => p.name)).toContain('proj-a');
  });

  it('does not duplicate project name in index', async () => {
    await saveProject('dup', 'data:image/png;base64,a');
    await saveProject('dup', 'data:image/png;base64,b');
    const names = await listProjects();
    expect(names.filter((p) => p.name === 'dup')).toHaveLength(1);
  });
});

describe('loadProject', () => {
  it('returns null for missing project', async () => {
    expect(await loadProject('nonexistent')).toBeNull();
  });

  it('loads source image data URL', async () => {
    await saveProject('img-proj', 'data:image/png;base64,myimage');
    const source = await loadProject('img-proj');
    expect(source).toBe('data:image/png;base64,myimage');
  });

  it('returns null for corrupt project JSON', async () => {
    localStorageMock['project:index'] = JSON.stringify({ names: ['corrupt'] });
    localStorageMock['corrupt'] = 'not-valid-json';
    expect(await loadProject('corrupt')).toBeNull();
  });
});

describe('listProjects', () => {
  it('returns empty array when no projects', async () => {
    expect(await listProjects()).toEqual([]);
  });

  it('returns projects sorted by updatedAt descending', async () => {
    await saveProject('old', 'data:image/png;base64,a');
    await new Promise((r) => setTimeout(r, 10));
    await saveProject('mid', 'data:image/png;base64,b');
    await new Promise((r) => setTimeout(r, 10));
    await saveProject('new', 'data:image/png;base64,c');

    const projects = await listProjects();
    expect(projects.map((p) => p.name)).toEqual(['new', 'mid', 'old']);
  });

  it('skips corrupt project JSON entries', async () => {
    await saveProject('good', 'data:image/png;base64,good');
    localStorageMock['project:index'] = JSON.stringify({ names: ['good', 'bad'] });
    localStorageMock['bad'] = 'corrupt-json';

    const projects = await listProjects();
    expect(projects.map((p) => p.name)).toEqual(['good']);
  });

  it('skips projects missing name field', async () => {
    localStorageMock['project:index'] = JSON.stringify({ names: ['noname'] });
    localStorageMock['noname'] = JSON.stringify({ sourceImage: 'data:x' });
    const projects = await listProjects();
    expect(projects).toEqual([]);
  });
});

describe('deleteProject', () => {
  it('deletes a project and removes from index', async () => {
    await saveProject('del-proj', 'data:image/png;base64,x');
    expect(await listProjects()).toHaveLength(1);

    await deleteProject('del-proj');
    expect(await listProjects()).toEqual([]);
    expect(await loadProject('del-proj')).toBeNull();
  });

  it('does not throw when deleting non-existent project', async () => {
    await expect(deleteProject('does-not-exist')).resolves.toBeUndefined();
    expect(await listProjects()).toEqual([]);
  });

  it('removes only the specified project from index', async () => {
    await saveProject('keep-me', 'data:image/png;base64,a');
    await saveProject('remove-me', 'data:image/png;base64,b');

    await deleteProject('remove-me');
    const projects = await listProjects();
    expect(projects.map((p) => p.name)).toEqual(['keep-me']);
  });
});
