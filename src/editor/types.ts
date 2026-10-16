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

/* ============================================================================
   TIER 1 — Adjustment Presets (saved bundles of slider values)
   ============================================================================ */

/** A named bundle of adjustments that can be applied with one tap. */
export interface AdjustmentPreset {
  id: string;
  name: string;
  adjustments: AdjustmentState;
  filter?: FilterName;
  createdAt: number;
}

/** Default built-in adjustment presets. */
export const DEFAULT_PRESETS: AdjustmentPreset[] = [
  {
    id: 'portrait-warm',
    name: 'Portrait Warm',
    adjustments: { brightness: 10, contrast: 5, saturation: 10, hue: 0, temperature: 25 },
    filter: 'warm',
    createdAt: Date.now(),
  },
  {
    id: 'cinematic-cool',
    name: 'Cinematic Cool',
    adjustments: { brightness: -5, contrast: 15, saturation: -5, hue: 0, temperature: -25 },
    filter: 'cool',
    createdAt: Date.now(),
  },
  {
    id: 'vintage-film',
    name: 'Vintage Film',
    adjustments: { brightness: -10, contrast: 10, saturation: -15, hue: 5, temperature: 15 },
    filter: 'vintage',
    createdAt: Date.now(),
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    adjustments: { brightness: 0, contrast: 35, saturation: 10, hue: 0, temperature: 0 },
    createdAt: Date.now(),
  },
  {
    id: 'soft-glow',
    name: 'Soft Glow',
    adjustments: { brightness: 15, contrast: -10, saturation: 5, hue: 0, temperature: 10 },
    filter: 'polaroid',
    createdAt: Date.now(),
  },
];

/* ============================================================================
   TIER 3 — Text Overlay (text drawn on the photo)
   ============================================================================ */

/** A text layer rendered over the photo. */
export interface TextOverlay {
  id: string;
  text: string;
  x: number;      // percent 0..100
  y: number;      // percent 0..100
  fontSize: number; // px
  color: string;  // hex or css color
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  opacity: number; // 0..1
  rotation: number; // degrees
}

/** Default empty text overlay. */
export const DEFAULT_TEXT_OVERLAY: TextOverlay = {
  id: '',
  text: 'Your text',
  x: 50,
  y: 50,
  fontSize: 48,
  color: '#ffffff',
  fontFamily: 'sans-serif',
  bold: false,
  italic: false,
  opacity: 1,
  rotation: 0,
};

/* ============================================================================
   TIER 5 — Export Presets (saved export settings)
   ============================================================================ */

/** Saved export configuration. */
export interface ExportPreset {
  id: string;
  name: string;
  format: ExportFormat;
  quality: number; // 0..1 for jpeg/webp
  maxWidth: number | null; // null = no resize
  maxHeight: number | null;
  watermark: string | null;
  createdAt: number;
}

/** Default built-in export presets. */
export const DEFAULT_EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'web-optimized',
    name: 'Web Optimized',
    format: 'jpeg',
    quality: 0.85,
    maxWidth: 2048,
    maxHeight: null,
    watermark: null,
    createdAt: Date.now(),
  },
  {
    id: 'print-quality',
    name: 'Print Quality',
    format: 'png',
    quality: 1,
    maxWidth: null,
    maxHeight: null,
    watermark: null,
    createdAt: Date.now(),
  },
  {
    id: 'social-media',
    name: 'Social Media',
    format: 'jpeg',
    quality: 0.9,
    maxWidth: 1080,
    maxHeight: null,
    watermark: null,
    createdAt: Date.now(),
  },
];
