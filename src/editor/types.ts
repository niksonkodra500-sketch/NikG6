export type AdjustmentName = 'brightness' | 'contrast' | 'saturation' | 'hue' | 'temperature';

/** Slider values are integers in [-100, 100]. */
export type AdjustmentState = Record<AdjustmentName, number>;

export type FilterName =
  | 'none'
  | 'grayscale'
  | 'sepia'
  | 'vintage'
  | 'polaroid'
  | 'kodachrome'
  | 'dramatic'
  | 'cool'
  | 'warm'
  | 'blur'
  | 'sharpen';

export type ExportFormat = 'png' | 'jpeg' | 'webp';

export interface TransformState {
  /** Degrees, normalized to (-180, 180], multiples of 90. */
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  /** Scale relative to the current source dimensions (>= 0). */
  scaleX: number;
  scaleY: number;
}

export interface CropState {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Full editor state; every edit is reconstructible from this plus the source image. */
export interface EditorSnapshot {
  adjustments: AdjustmentState;
  filter: FilterName;
  transform: TransformState;
  crop: CropState | null;
}

export const DEFAULT_ADJUSTMENTS: AdjustmentState = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  temperature: 0,
};

export const DEFAULT_TRANSFORM: TransformState = {
  rotation: 0,
  flipX: false,
  flipY: false,
  scaleX: 1,
  scaleY: 1,
};

export const DEFAULT_SNAPSHOT: EditorSnapshot = {
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  filter: 'none',
  transform: { ...DEFAULT_TRANSFORM },
  crop: null,
};

export const FILTER_LABELS: Record<FilterName, string> = {
  none: 'Original',
  grayscale: 'Grayscale',
  sepia: 'Sepia',
  vintage: 'Vintage',
  polaroid: 'Polaroid',
  kodachrome: 'Kodachrome',
  dramatic: 'Dramatic',
  cool: 'Cool',
  warm: 'Warm',
  blur: 'Blur',
  sharpen: 'Sharpen',
};
