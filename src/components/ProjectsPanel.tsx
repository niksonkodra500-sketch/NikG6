import { useCallback, useEffect, useState } from 'react';
import type { Project } from '../editor/types';
import { listProjects, loadProject, saveProject, deleteProject } from '../storage/projects';

interface ProjectsPanelProps {
  sourceDataUrl: string | null;
  onRestore: (sourceDataUrl: string, snapshot: Project['snapshot']) => void;
  onClose: () => void;
}

/**
 * Projects panel: save the current photo + edits as a named project, list
 * saved projects, and reopen one (restoring the source image and editor
 * state). Projects are stored via Capacitor Filesystem (native) or
 * localStorage (web).
 */
export function ProjectsPanel(props: ProjectsPanelProps) {
  const { sourceDataUrl, onRestore, onClose } = props;
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setProjects(await listProjects());
    } catch {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSave = useCallback(async () => {
    if (!sourceDataUrl) return;
    const trimmed = name.trim();
    const finalName = trimmed || `Project ${new Date().toLocaleDateString()}`;
    setSaving(true);
    try {
      await saveProject(finalName, sourceDataUrl);
      setName('');
      await refresh();
    } finally {
      setSaving(false);
    }
  }, [name, sourceDataUrl, refresh]);

  const handleRestore = useCallback(
    async (project: Project) => {
      try {
        const dataUrl = await loadProject(project.name);
        if (dataUrl) {
          onRestore(dataUrl, project.snapshot);
        }
      } catch {
        // ignore restore failures
      }
    },
    [onRestore],
  );

  const handleDelete = useCallback(
    async (project: Project) => {
      try {
        await deleteProject(project.name);
        await refresh();
      } catch {
        // ignore delete failures
      }
    },
    [refresh],
  );

  return (
    <div className="panel floating projects-panel">
      <h2>
        Projects
        <button type="button" className="link-button" onClick={onClose} aria-label="Close">
          Close
        </button>
      </h2>

      <div className="project-save">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name (optional)"
          disabled={saving}
        />
        <button type="button" onClick={() => void handleSave()} disabled={!sourceDataUrl || saving}>
          {saving ? 'Saving…' : 'Save current'}
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="empty-state">No saved projects yet. Save one to resume it later.</p>
      ) : (
        <ul className="project-list">
          {projects.map((project) => (
            <li key={project.name} className="project-item">
              <div className="project-meta">
                <span className="project-name">{project.name}</span>
                <span className="project-date">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="project-actions">
                <button type="button" onClick={() => void handleRestore(project)}>
                  Open
                </button>
                <button type="button" className="danger" onClick={() => void handleDelete(project)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
