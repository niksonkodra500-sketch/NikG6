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
});

describe('mergeAdjustment', () => {
  it('updates one adjustment and clamps', () => {
    const next = mergeAdjustment(DEFAULT_ADJUSTMENTS, 'brightness', 120);
    expect(next.brightness).toBe(100);
    expect(next.contrast).toBe(0);
  });
});

describe('isNeutralAdjustments', () => {
  it('detects neutral and non-neutral states', () => {
    expect(isNeutralAdjustments(DEFAULT_ADJUSTMENTS)).toBe(true);
    expect(isNeutralAdjustments({ ...DEFAULT_ADJUSTMENTS, hue: 10 })).toBe(false);
  });
});
