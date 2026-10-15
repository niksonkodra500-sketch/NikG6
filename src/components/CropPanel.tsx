import { useCallback, useState } from 'react';
import type { CropAspect, CropState } from '../editor/types';
import { CROP_ASPECT_PRESETS } from '../editor/types';

interface CropPanelProps {
  crop: CropState | null;
  naturalWidth: number;
  naturalHeight: number;
  onCrop: (x: number, y: number, width: number, height: number, aspect?: number | null) => void;
  onCropToAspect: (aspect: CropAspect) => void;
  onClearCrop: () => void;
  onClose?: () => void;
}

/**
 * Crop controls: aspect-ratio presets (1:1, 4:3, 16:9...) that crop the
 * image centered, plus a freeform crop button and a "clear crop" option.
 */
export function CropPanel(props: CropPanelProps) {
  const { crop, naturalWidth, naturalHeight, onCrop, onCropToAspect, onClearCrop, onClose } = props;
  const [mode, setMode] = useState<CropAspect>('free');

  const handleAspect = useCallback(
    (aspect: CropAspect) => {
      setMode(aspect);
      onCropToAspect(aspect);
    },
    [onCropToAspect],
  );

  const handleFreeform = useCallback(() => {
    if (!naturalWidth || !naturalHeight) return;
    const w = Math.round(naturalWidth * 0.8);
    const h = Math.round(naturalHeight * 0.8);
    const x = Math.round((naturalWidth - w) / 2);
    const y = Math.round((naturalHeight - h) / 2);
    setMode('free');
    onCrop(x, y, w, h, null);
  }, [naturalWidth, naturalHeight, onCrop]);

  return (
    <div className="panel floating crop-panel">
      <div className="panel-header">
        <h2>Crop</h2>
        {onClose && (
          <button type="button" className="panel-close" aria-label="Close crop" onClick={onClose}>
            ×
          </button>
        )}
      </div>
      <div className="filter-grid">
        {CROP_ASPECT_PRESETS.map((preset) => (
          <button
            key={preset.ratio}
            type="button"
            className={mode === preset.ratio ? 'active' : ''}
            onClick={() => handleAspect(preset.ratio)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="crop-actions">
        <button type="button" onClick={handleFreeform} disabled={!naturalWidth}>
          Crop 80%
        </button>
        <button type="button" onClick={onClearCrop} disabled={!crop}>
          Clear
        </button>
      </div>
      {crop && (
        <p className="crop-info">
          Cropped to {crop.width}x{crop.height}
          {crop.aspect ? ` (${formatAspect(crop.aspect)})` : ''}
        </p>
      )}
    </div>
  );
}

function formatAspect(value: number): string {
  const presets: Array<[number, string]> = [
    [1, '1:1'],
    [4 / 3, '4:3'],
    [3 / 2, '3:2'],
    [16 / 9, '16:9'],
    [9 / 16, '9:16'],
  ];
  for (const [ratio, label] of presets) {
    if (Math.abs(value - ratio) < 0.02) return label;
  }
  return value.toFixed(2);
}
