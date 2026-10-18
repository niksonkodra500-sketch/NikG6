import { describe, expect, it } from 'vitest';
import {
  clampSlider,
  isNeutralAdjustments,
  mergeAdjustment,
  sliderToFilterValue,
} from './adjustments';
import { DEFAULT_ADJUSTMENTS } from './types';

describe('clampSlider', () => {
  it('clamps to [-100, 100] and rounds', () => {
    expect(clampSlider(-150)).toBe(-100);
    expect(clampSlider(150)).toBe(100);
    expect(clampSlider(42.6)).toBe(43);
    expect(clampSlider(-42.6)).toBe(-43);
  });

  it('handles exact boundaries', () => {
    expect(clampSlider(100)).toBe(100);
    expect(clampSlider(-100)).toBe(-100);
    expect(clampSlider(0)).toBe(0);
  });

  it('handles decimal rounding at boundaries', () => {
    expect(clampSlider(99.4)).toBe(99);
    expect(clampSlider(99.6)).toBe(100);
    expect(clampSlider(-99.4)).toBe(-99);
    expect(clampSlider(-99.6)).toBe(-100);
  });

  it('handles extreme values', () => {
    expect(clampSlider(Infinity)).toBe(100);
    expect(clampSlider(-Infinity)).toBe(-100);
    expect(clampSlider(1e10)).toBe(100);
    expect(clampSlider(-1e10)).toBe(-100);
  });

  it('handles NaN', () => {
    expect(clampSlider(NaN)).toBe(NaN);
  });
});

describe('sliderToFilterValue', () => {
  it('maps hue to degrees', () => {
    expect(sliderToFilterValue('hue', 50)).toBe(180);
    expect(sliderToFilterValue('hue', -50)).toBe(-180);
    expect(sliderToFilterValue('hue', 0)).toBe(0);
  });

  it('maps other adjustments to [-1, 1]', () => {
    expect(sliderToFilterValue('brightness', 100)).toBe(1);
    expect(sliderToFilterValue('contrast', -100)).toBe(-1);
    expect(sliderToFilterValue('saturation', 0)).toBe(0);
    expect(sliderToFilterValue('temperature', 25)).toBe(0.25);
  });

  it('maps boundary values correctly', () => {
    expect(sliderToFilterValue('brightness', 100)).toBe(1);
    expect(sliderToFilterValue('brightness', -100)).toBe(-1);
    expect(sliderToFilterValue('hue', 100)).toBe(360);
    expect(sliderToFilterValue('hue', -100)).toBe(-360);
    expect(sliderToFilterValue('contrast', 50)).toBe(0.5);
    expect(sliderToFilterValue('saturation', -50)).toBe(-0.5);
  });

  it('handles intermediate values', () => {
    expect(sliderToFilterValue('brightness', 33)).toBe(0.33);
    expect(sliderToFilterValue('contrast', -66)).toBe(-0.66);
  });
});

describe('mergeAdjustment', () => {
  it('updates one adjustment and clamps', () => {
    const next = mergeAdjustment(DEFAULT_ADJUSTMENTS, 'brightness', 120);
    expect(next.brightness).toBe(100);
    expect(next.contrast).toBe(0);
  });

  it('does not mutate original', () => {
    const original = { ...DEFAULT_ADJUSTMENTS };
    mergeAdjustment(original, 'brightness', 50);
    expect(original.brightness).toBe(0);
  });

  it('clamps negative values', () => {
    const next = mergeAdjustment(DEFAULT_ADJUSTMENTS, 'contrast', -200);
    expect(next.contrast).toBe(-100);
  });

  it('returns new object with all adjustments preserved', () => {
    const current = { ...DEFAULT_ADJUSTMENTS, brightness: 20, contrast: -10 };
    const next = mergeAdjustment(current, 'saturation', 30);
    expect(next).toEqual({
      brightness: 20,
      contrast: -10,
      saturation: 30,
      hue: 0,
      temperature: 0,
    });
  });

  it('works with all adjustment names', () => {
    for (const name of ['brightness', 'contrast', 'saturation', 'hue', 'temperature'] as const) {
      const next = mergeAdjustment(DEFAULT_ADJUSTMENTS, name, 42);
      expect(next[name]).toBe(42);
    }
  });
});

describe('isNeutralAdjustments', () => {
  it('detects neutral and non-neutral states', () => {
    expect(isNeutralAdjustments(DEFAULT_ADJUSTMENTS)).toBe(true);
    expect(isNeutralAdjustments({ ...DEFAULT_ADJUSTMENTS, hue: 10 })).toBe(false);
  });

  it('returns false when any adjustment is non-zero', () => {
    expect(isNeutralAdjustments({ ...DEFAULT_ADJUSTMENTS, brightness: 1 })).toBe(false);
    expect(isNeutralAdjustments({ ...DEFAULT_ADJUSTMENTS, contrast: -1 })).toBe(false);
    expect(isNeutralAdjustments({ ...DEFAULT_ADJUSTMENTS, saturation: 1 })).toBe(false);
    expect(isNeutralAdjustments({ ...DEFAULT_ADJUSTMENTS, hue: 1 })).toBe(false);
    expect(isNeutralAdjustments({ ...DEFAULT_ADJUSTMENTS, temperature: -1 })).toBe(false);
  });

  it('returns true only when all are exactly zero', () => {
    expect(isNeutralAdjustments({ ...DEFAULT_ADJUSTMENTS, brightness: 0.001 })).toBe(false);
    expect(isNeutralAdjustments({ ...DEFAULT_ADJUSTMENTS, contrast: -0.001 })).toBe(false);
  });

  it('handles all-zero state', () => {
    const allZero = { brightness: 0, contrast: 0, saturation: 0, hue: 0, temperature: 0 };
    expect(isNeutralAdjustments(allZero)).toBe(true);
  });
});
