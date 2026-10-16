import { useState } from 'react';
import { DEFAULT_TEXT_OVERLAY, type TextOverlay } from '../editor/types';

interface TextOverlayPanelProps {
  overlays: TextOverlay[];
  onAdd: () => TextOverlay;
  onUpdate: (id: string, updates: Partial<TextOverlay>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/**
 * Tier 3 — Text Overlay.
 * Add text layers on top of the photo with position, font, color, and opacity controls.
 */
export function TextOverlayPanel(props: TextOverlayPanelProps) {
  const { overlays, onAdd, onUpdate, onDelete, onClose } = props;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = overlays.find((o) => o.id === selectedId);

  const handleAdd = () => {
    const newOverlay = onAdd();
    setSelectedId(newOverlay.id);
  };

  const handleUpdate = (updates: Partial<TextOverlay>) => {
    if (!selectedId) return;
    onUpdate(selectedId, updates);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setSelectedId(null);
  };

  return (
    <div className="panel floating text-overlay-panel">
      <div className="panel-header">
        <h2>Text Overlay</h2>
        {onClose && (
          <button
            type="button"
            className="panel-close"
            aria-label="Close text overlay"
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>

      <div className="text-actions">
        <button type="button" onClick={handleAdd}>
          + Add Text
        </button>
      </div>

      {overlays.length === 0 ? (
        <p className="empty-state">No text overlays yet. Add one to start captioning your photo.</p>
      ) : (
        <>
          <ul className="overlay-list">
            {overlays.map((overlay) => (
              <li
                key={overlay.id}
                className={`overlay-item ${selectedId === overlay.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(overlay.id)}
              >
                <span className="overlay-text-preview" style={{ fontWeight: overlay.bold ? 'bold' : 'normal', fontStyle: overlay.italic ? 'italic' : 'normal' }}>
                  "{overlay.text}"
                </span>
                <button
                  type="button"
                  className="danger"
                  onClick={() => handleDelete(overlay.id)}
                  aria-label={`Delete "${overlay.text}"`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="overlay-editor">
              <label>
                Text
                <input
                  type="text"
                  value={selected.text}
                  onChange={(e) => handleUpdate({ text: e.target.value })}
                />
              </label>
              <label>
                Size (px)
                <input
                  type="number"
                  min={12}
                  max={200}
                  value={selected.fontSize}
                  onChange={(e) => handleUpdate({ fontSize: Number(e.target.value) || 48 })}
                />
              </label>
              <label>
                Color
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => handleUpdate({ color: e.target.value })}
                />
              </label>
              <label>
                Opacity
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(selected.opacity * 100)}
                  onChange={(e) => handleUpdate({ opacity: Number(e.target.value) / 100 })}
                />
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={selected.bold}
                  onChange={() => handleUpdate({ bold: !selected.bold })}
                />
                Bold
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={selected.italic}
                  onChange={() => handleUpdate({ italic: !selected.italic })}
                />
                Italic
              </label>
              <label>
                Rotation (deg)
                <input
                  type="number"
                  min={-180}
                  max={180}
                  value={selected.rotation}
                  onChange={(e) => handleUpdate({ rotation: Number(e.target.value) || 0 })}
                />
              </label>
              <button type="button" onClick={() => handleDelete(selected.id)}>
                Remove Text
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
