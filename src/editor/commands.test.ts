import { describe, expect, it } from 'vitest';
import {
  clampNumber,
  clampPositiveInt,
  clampSliderArg,
  isAdjustmentName,
  isExportFormat,
  isFilterName,
  parseRotationArg,
} from './commands';

describe('clampNumber', () => {
  it('falls back for non-numbers', () => {
    expect(clampNumber('x', 0, 10, 5)).toBe(5);
    expect(clampNumber(NaN, 0, 10, 5)).toBe(5);
    expect(clampNumber(undefined, 0, 10, 5)).toBe(5);
    expect(clampNumber(null, 0, 10, 5)).toBe(5);
  });

  it('clamps to range', () => {
    expect(clampNumber(15, 0, 10, 5)).toBe(10);
    expect(clampNumber(-1, 0, 10, 5)).toBe(0);
    expect(clampNumber(7, 0, 10, 5)).toBe(7);
  });
});

describe('argument helpers', () => {
  it('clamps slider args', () => {
    expect(clampSliderArg(200)).toBe(100);
    expect(clampSliderArg(-200)).toBe(-100);
    expect(clampSliderArg('x')).toBe(0);
  });

  it('clamps positive ints', () => {
    expect(clampPositiveInt(3.7, 10)).toBe(4);
    expect(clampPositiveInt(-5, 10)).toBe(10);
    expect(clampPositiveInt('x', 10)).toBe(10);
  });

  it('parses rotation', () => {
    expect(parseRotationArg(90)).toBe(90);
    expect(parseRotationArg(450)).toBe(360);
    expect(parseRotationArg('x')).toBe(0);
  });
});

describe('type guards', () => {
  it('validates adjustment names', () => {
    expect(isAdjustmentName('hue')).toBe(true);
    expect(isAdjustmentName('warmth')).toBe(false);
  });

  it('validates filter names', () => {
    expect(isFilterName('vintage')).toBe(true);
    expect(isFilterName('nope')).toBe(false);
  });

  it('validates export formats', () => {
    expect(isExportFormat('webp')).toBe(true);
    expect(isExportFormat('bmp')).toBe(false);
  });
});
