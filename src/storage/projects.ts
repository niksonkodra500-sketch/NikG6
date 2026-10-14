import type { Project } from '../editor/types';
import { loadProjectJson, saveProjectJson } from './persistence';

const PROJECT_INDEX_KEY = 'project:index';

interface ProjectIndex {
  names: string[];
}

async function readIndex(): Promise<ProjectIndex> {
  const raw = await loadProjectJson(PROJECT_INDEX_KEY);
  if (!raw) return { names: [] };
  try {
    const parsed = JSON.parse(raw) as ProjectIndex;
    if (parsed && Array.isArray(parsed.names)) {
      return { names: parsed.names.filter((n) => typeof n === 'string') };
    }
  } catch {
    // ignore corrupt index
  }
  return { names: [] };
}

async function writeIndex(index: ProjectIndex): Promise<void> {
  await saveProjectJson(PROJECT_INDEX_KEY, JSON.stringify(index));
}

/** Returns all saved projects, most recently updated first. */
export async function listProjects(): Promise<Project[]> {
  const index = await readIndex();
  const projects: Project[] = [];
  for (const name of index.names) {
    const raw = await loadProjectJson(name);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as Project;
      if (parsed && typeof parsed.name === 'string') {
        projects.push(parsed);
      }
    } catch {
      // skip corrupt project
    }
  }
  projects.sort((a, b) => b.updatedAt - a.updatedAt);
  return projects;
}

/** Saves (or updates) a project, registering it in the index. */
export async function saveProject(
  name: string,
  sourceDataUrl: string,
  snapshot?: Project['snapshot'],
): Promise<Project> {
  const trimmed = name.trim();
  const index = await readIndex();
  const now = Date.now();

  let existing: Project | null = null;
  const raw = await loadProjectJson(trimmed);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Project;
      if (parsed && typeof parsed.name === 'string') existing = parsed;
    } catch {
      // ignore
    }
  }

  const project: Project = {
    name: trimmed,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    sourceImage: sourceDataUrl,
    snapshot: snapshot ??
      existing?.snapshot ?? {
        adjustments: { brightness: 0, contrast: 0, saturation: 0, hue: 0, temperature: 0 },
        filter: 'none',
        transform: { rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1 },
        crop: null,
      },
  };

  await saveProjectJson(trimmed, JSON.stringify(project));
  if (!index.names.includes(trimmed)) {
    index.names.push(trimmed);
    await writeIndex(index);
  }
  return project;
}

/** Loads a project's source image data URL. */
export async function loadProject(name: string): Promise<string | null> {
  const raw = await loadProjectJson(name);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Project;
    return parsed.sourceImage ?? null;
  } catch {
    return null;
  }
}

/** Deletes a project and removes it from the index. */
export async function deleteProject(name: string): Promise<void> {
  try {
    await saveProjectJson(name, JSON.stringify(null));
  } catch {
    // ignore
  }
  const index = await readIndex();
  const next = index.names.filter((n) => n !== name);
  if (next.length !== index.names.length) {
    await writeIndex({ names: next });
  }
}
