import { describe, expect, it } from 'vitest';
import {
  clampAspectRatio,
  clampNumber,
  clampPositiveInt,
  clampPositiveNumber,
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

  it('returns fallback for Infinity since it fails isFinite check', () => {
    expect(clampNumber(Infinity, 0, 10, 5)).toBe(5);
    expect(clampNumber(-Infinity, 0, 10, 5)).toBe(5);
  });

  it('clamps to min when below range', () => {
    expect(clampNumber(-20, -10, -5, -7)).toBe(-10);
    expect(clampNumber(0, -10, -5, -7)).toBe(-5);
  });

  it('handles zero range', () => {
    expect(clampNumber(5, 5, 5, 0)).toBe(5);
    expect(clampNumber(10, 5, 5, 0)).toBe(5);
    expect(clampNumber(0, 5, 5, 0)).toBe(5);
  });

  it('handles negative fallback', () => {
    expect(clampNumber('bad', -100, -1, -50)).toBe(-50);
  });

  it('handles array and object inputs', () => {
    expect(clampNumber([1], 0, 10, 5)).toBe(5);
    expect(clampNumber({ x: 1 }, 0, 10, 5)).toBe(5);
    expect(clampNumber(true, 0, 10, 5)).toBe(5);
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

  it('clamps positive ints to boundary', () => {
    expect(clampPositiveInt(1, 10)).toBe(1);
    expect(clampPositiveInt(100000, 10)).toBe(100000);
    expect(clampPositiveInt(100001, 10)).toBe(10);
    expect(clampPositiveInt(0, 10)).toBe(10);
  });

  it('clamps positive ints for NaN/Infinity', () => {
    expect(clampPositiveInt(NaN, 10)).toBe(10);
    expect(clampPositiveInt(Infinity, 10)).toBe(10);
  });

  it('clampPositiveNumber boundaries', () => {
    expect(clampPositiveNumber(0.5, 0.5)).toBe(0.5);
    expect(clampPositiveNumber(0, 0.5)).toBe(0.01);
    expect(clampPositiveNumber(2, 0.5)).toBe(1);
    expect(clampPositiveNumber('bad', 0.5)).toBe(0.5);
  });

  it('clampAspectRatio boundaries', () => {
    expect(clampAspectRatio(1, 0.5)).toBe(1);
    expect(clampAspectRatio(0.001, 0.5)).toBe(0.01);
    expect(clampAspectRatio(200, 0.5)).toBe(100);
    expect(clampAspectRatio('bad', 0.5)).toBe(0.5);
  });

  it('parseRotationArg normalizes and rounds', () => {
    expect(parseRotationArg(90)).toBe(90);
    expect(parseRotationArg(450)).toBe(360);
    expect(parseRotationArg('x')).toBe(0);
    expect(parseRotationArg(-450)).toBe(-360);
    expect(parseRotationArg(180.7)).toBe(181);
    expect(parseRotationArg(-180.7)).toBe(-181);
  });

  it('parseRotationArg handles Infinity/NaN', () => {
    expect(parseRotationArg(NaN)).toBe(0);
    expect(parseRotationArg(Infinity)).toBe(0);
  });
});

describe('type guards', () => {
  it('validates adjustment names', () => {
    expect(isAdjustmentName('hue')).toBe(true);
    expect(isAdjustmentName('warmth')).toBe(false);
    expect(isAdjustmentName(123)).toBe(false);
    expect(isAdjustmentName(null)).toBe(false);
    expect(isAdjustmentName(undefined)).toBe(false);
    expect(isAdjustmentName('')).toBe(false);
    expect(isAdjustmentName('BRIGHTNESS')).toBe(false);
  });

  it('validates filter names', () => {
    expect(isFilterName('vintage')).toBe(true);
    expect(isFilterName('nope')).toBe(false);
    expect(isFilterName(123)).toBe(false);
    expect(isFilterName(null)).toBe(false);
    expect(isFilterName(undefined)).toBe(false);
    expect(isFilterName('')).toBe(false);
    expect(isFilterName('SEPIA')).toBe(false);
  });

  it('validates export formats', () => {
    expect(isExportFormat('webp')).toBe(true);
    expect(isExportFormat('bmp')).toBe(false);
    expect(isExportFormat(123)).toBe(false);
    expect(isExportFormat(null)).toBe(false);
    expect(isExportFormat(undefined)).toBe(false);
    expect(isExportFormat('')).toBe(false);
    expect(isExportFormat('PNG')).toBe(false);
  });

  it('lists all valid adjustment names', () => {
    expect(isAdjustmentName('brightness')).toBe(true);
    expect(isAdjustmentName('contrast')).toBe(true);
    expect(isAdjustmentName('saturation')).toBe(true);
    expect(isAdjustmentName('hue')).toBe(true);
    expect(isAdjustmentName('temperature')).toBe(true);
  });

  it('lists all valid filter names', () => {
    expect(isFilterName('none')).toBe(true);
    expect(isFilterName('grayscale')).toBe(true);
    expect(isFilterName('sepia')).toBe(true);
    expect(isFilterName('vintage')).toBe(true);
    expect(isFilterName('polaroid')).toBe(true);
    expect(isFilterName('kodachrome')).toBe(true);
    expect(isFilterName('dramatic')).toBe(true);
    expect(isFilterName('cool')).toBe(true);
    expect(isFilterName('warm')).toBe(true);
    expect(isFilterName('blur')).toBe(true);
    expect(isFilterName('sharpen')).toBe(true);
  });

  it('lists all valid export formats', () => {
    expect(isExportFormat('png')).toBe(true);
    expect(isExportFormat('jpeg')).toBe(true);
    expect(isExportFormat('webp')).toBe(true);
  });
});
