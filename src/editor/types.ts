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

/** Aspect ratio constraint for cropping. `null` means freeform. */
export type CropAspect = 'free' | '1:1' | '4:3' | '3:2' | '16:9' | '9:16';

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
  /** The aspect ratio the crop was constrained to, if any. */
  aspect: number | null;
}

/** Full editor state; every edit is reconstructible from this plus the source image. */
export interface EditorSnapshot {
  adjustments: AdjustmentState;
  filter: FilterName;
  transform: TransformState;
  crop: CropState | null;
}

/** A saved project: the source image (data URL) plus the editor snapshot. */
export interface Project {
  name: string;
  createdAt: number;
  updatedAt: number;
  sourceImage: string;
  snapshot: EditorSnapshot;
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

/** Preset crop aspect ratios with human-readable labels. */
export const CROP_ASPECT_PRESETS: Array<{
  ratio: CropAspect;
  label: string;
  value: number | null;
}> = [
  { ratio: 'free', label: 'Free', value: null },
  { ratio: '1:1', label: '1:1', value: 1 },
  { ratio: '4:3', label: '4:3', value: 4 / 3 },
  { ratio: '3:2', label: '3:2', value: 3 / 2 },
  { ratio: '16:9', label: '16:9', value: 16 / 9 },
  { ratio: '9:16', label: '9:16', value: 9 / 16 },
];

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
