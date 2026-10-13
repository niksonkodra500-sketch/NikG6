import type { AdjustmentName, ExportFormat, FilterName } from './types';

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function clampSliderArg(value: unknown): number {
  return clampNumber(value, -100, 100, 0);
}

export function clampPositiveInt(value: unknown, fallback: number): number {
  const n = clampNumber(value, 1, 100_000, fallback);
  return Math.round(n);
}

export function clampPositiveNumber(value: unknown, fallback: number): number {
  return clampNumber(value, 0.01, 1, fallback);
}

export function parseRotationArg(value: unknown): number {
  const n = clampNumber(value, -360, 360, 0);
  return Math.round(n);
}

const ADJUSTMENT_NAMES: AdjustmentName[] = [
  'brightness',
  'contrast',
  'saturation',
  'hue',
  'temperature',
];

const FILTER_NAMES: FilterName[] = [
  'none',
  'grayscale',
  'sepia',
  'vintage',
  'polaroid',
  'kodachrome',
  'dramatic',
  'cool',
  'warm',
  'blur',
  'sharpen',
];

const EXPORT_FORMATS: ExportFormat[] = ['png', 'jpeg', 'webp'];

export function isAdjustmentName(value: unknown): value is AdjustmentName {
  return (ADJUSTMENT_NAMES as string[]).includes(value as string);
}

export function isFilterName(value: unknown): value is FilterName {
  return (FILTER_NAMES as string[]).includes(value as string);
}

export function isExportFormat(value: unknown): value is ExportFormat {
  return (EXPORT_FORMATS as string[]).includes(value as string);
}
