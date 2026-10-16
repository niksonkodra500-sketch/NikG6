import { useCallback, useEffect, useState } from 'react';
import type { AdjustmentPreset, AdjustmentState } from '../editor/types';
import {
  deletePreset,
  loadPresets,
  savePreset,
} from '../storage/persistence';

interface PresetPanelProps {
  adjustments: AdjustmentState;
  onApplyPreset: (adjustments: AdjustmentState, filter?: string) => void;
  onClose: () => void;
}

/**
 * Tier 1 — Preset Bundles.
 * Save the current adjustment state as a named preset, list saved presets,
 * and apply a saved preset back to the editor.
 */
export function PresetPanel(props: PresetPanelProps) {
  const { adjustments, onApplyPreset, onClose } = props;
  const [presets, setPresets] = useState<AdjustmentPreset[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setPresets(await loadPresets());
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
      const preset: AdjustmentPreset = {
        id: `preset-${Date.now()}`,
        name: trimmed,
        adjustments,
        createdAt: Date.now(),
      };
      await savePreset(preset);
      setName('');
      await refresh();
    } finally {
      setSaving(false);
    }
  }, [name, adjustments, refresh]);

  const handleApply = useCallback(
    async (preset: AdjustmentPreset) => {
      onApplyPreset(preset.adjustments, preset.filter);
      onClose();
    },
    [onApplyPreset, onClose],
  );

  const handleDelete = useCallback(
    async (preset: AdjustmentPreset) => {
      try {
        await deletePreset(preset.id);
        await refresh();
      } catch {
        // ignore delete failures
      }
    },
    [refresh],
  );

  return (
    <div className="panel floating preset-panel">
      <div className="panel-header">
        <h2>Presets</h2>
        {onClose && (
          <button
            type="button"
            className="panel-close"
            aria-label="Close presets"
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

      {presets.length === 0 ? (
        <p className="empty-state">No saved presets yet. Save your current adjustments as a preset.</p>
      ) : (
        <ul className="preset-list">
          {presets.map((preset) => (
            <li key={preset.id} className="preset-item">
              <div className="preset-meta">
                <span className="preset-name">{preset.name}</span>
                <span className="preset-date">
                  {new Date(preset.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="preset-actions">
                <button
                  type="button"
                  onClick={() => void handleApply(preset)}
                >
                  Apply
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => void handleDelete(preset)}
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
