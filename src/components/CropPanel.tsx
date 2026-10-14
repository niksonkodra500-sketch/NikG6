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
}

/**
 * Crop controls: aspect-ratio presets (1:1, 4:3, 16:9...) that crop the
 * image centered, plus a freeform crop button and a "clear crop" option.
 */
export function CropPanel(props: CropPanelProps) {
  const [mode, setMode] = useState<CropAspect>('free');

  const handleAspect = useCallback(
    (aspect: CropAspect) => {
      setMode(aspect);
      props.onCropToAspect(aspect);
    },
    [props.onCropToAspect],
  );

  const handleFreeform = useCallback(() => {
    if (!props.naturalWidth || !props.naturalHeight) return;
    const w = Math.round(props.naturalWidth * 0.8);
    const h = Math.round(props.naturalHeight * 0.8);
    const x = Math.round((props.naturalWidth - w) / 2);
    const y = Math.round((props.naturalHeight - h) / 2);
    setMode('free');
    props.onCrop(x, y, w, h, null);
  }, [props.naturalWidth, props.naturalHeight, props.onCrop]);

  return (
    <div className="panel crop-panel">
      <h2>Crop</h2>
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
        <button type="button" onClick={handleFreeform} disabled={!props.naturalWidth}>
          Crop 80%
        </button>
        <button type="button" onClick={props.onClearCrop} disabled={!props.crop}>
          Clear
        </button>
      </div>
      {props.crop && (
        <p className="crop-info">
          Cropped to {props.crop.width}x{props.crop.height}
          {props.crop.aspect ? ` (${formatAspect(props.crop.aspect)})` : ''}
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
