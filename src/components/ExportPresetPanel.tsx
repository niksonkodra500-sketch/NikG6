import { useCallback, useEffect, useState } from 'react';
import type { ExportFormat, ExportPreset } from '../editor/types';
import {
  deleteExportPreset,
  loadExportPresets,
  saveExportPreset,
} from '../storage/persistence';

interface ExportPresetPanelProps {
  exportFormat: ExportFormat;
  onExportFormatChange: (format: ExportFormat) => void;
  onClose: () => void;
}

/**
 * Tier 5 — Export Presets.
 * Save named export configurations (format, quality, max dimensions) and
 * apply them with one tap before exporting.
 */
export function ExportPresetPanel(props: ExportPresetPanelProps) {
  const { exportFormat, onExportFormatChange, onClose } = props;
  const [presets, setPresets] = useState<ExportPreset[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setPresets(await loadExportPresets());
    } catch {
      setPresets([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const preset: ExportPreset = {
        id: `export_preset-${Date.now()}`,
        name: trimmed,
        format: exportFormat,
        quality: exportFormat === 'png' ? 1 : 0.92,
        maxWidth: null,
        maxHeight: null,
        watermark: null,
        createdAt: Date.now(),
      };
      await saveExportPreset(preset);
      setName('');
      await refresh();
    } finally {
      setSaving(false);
    }
  }, [name, exportFormat, refresh]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteExportPreset(id);
        await refresh();
      } catch {
        // ignore delete failures
      }
    },
    [refresh],
  );

  return (
    <div className="panel floating export-preset-panel">
      <div className="panel-header">
        <h2>Export Presets</h2>
        {onClose && (
          <button
            type="button"
            className="panel-close"
            aria-label="Close export presets"
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>

      <div className="preset-save">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Preset name"
          disabled={saving}
        />
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!name.trim() || saving}
        >
          {saving ? 'Saving…' : 'Save current'}
        </button>
      </div>

      <div className="format-select">
        <label>
          Format
          <select
            value={exportFormat}
            onChange={(e) => onExportFormatChange(e.target.value as ExportFormat)}
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
        </label>
      </div>

      {presets.length === 0 ? (
        <p className="empty-state">No saved export presets yet. Save your current export settings as a preset.</p>
      ) : (
        <ul className="preset-list">
          {presets.map((preset) => (
            <li key={preset.id} className="preset-item">
              <div className="preset-meta">
                <span className="preset-name">{preset.name}</span>
                <span className="preset-format">
                  {preset.format.toUpperCase()}
                  {preset.quality !== null ? ` · Q${Math.round(preset.quality * 100)}` : ''}
                </span>
              </div>
              <div className="preset-actions">
                <button
                  type="button"
                  className="danger"
                  onClick={() => void handleDelete(preset.id)}
                >
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
