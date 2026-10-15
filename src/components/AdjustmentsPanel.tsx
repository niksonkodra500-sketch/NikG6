import { isNeutralAdjustments } from '../editor/adjustments';
import type { AdjustmentName, AdjustmentState } from '../editor/types';

interface AdjustmentsPanelProps {
  adjustments: AdjustmentState;
  onChange: (name: AdjustmentName, value: number) => void;
  onCommit: () => void;
  onClose?: () => void;
}

const SLIDERS: Array<{ name: AdjustmentName; label: string }> = [
  { name: 'brightness', label: 'Brightness' },
  { name: 'contrast', label: 'Contrast' },
  { name: 'saturation', label: 'Saturation' },
  { name: 'hue', label: 'Hue' },
  { name: 'temperature', label: 'Temperature' },
];

export function AdjustmentsPanel({
  adjustments,
  onChange,
  onCommit,
  onClose,
}: AdjustmentsPanelProps) {
  const neutral = isNeutralAdjustments(adjustments);

  const resetAll = () => {
    SLIDERS.forEach(({ name }) => {
      onChange(name, 0);
    });
    onCommit();
  };

  return (
    <div className="panel floating adjustments-panel">
      <div className="panel-header">
        <h2>Adjustments</h2>
        {onClose && (
          <button
            type="button"
            className="panel-close"
            aria-label="Close adjustments"
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>
      {SLIDERS.map(({ name, label }) => (
        <label key={name} className="slider-row">
          <span>{label}</span>
          <input
            type="range"
            min={-100}
            max={100}
            value={adjustments[name]}
            onChange={(event) => {
              onChange(name, Number(event.target.value));
            }}
            onPointerUp={() => {
              onCommit();
            }}
            onKeyUp={() => {
              onCommit();
            }}
            onBlur={() => {
              onCommit();
            }}
          />
          <span className="slider-value">{adjustments[name]}</span>
        </label>
      ))}
      <button type="button" disabled={neutral} onClick={resetAll}>
        Reset adjustments
      </button>
    </div>
  );
}
