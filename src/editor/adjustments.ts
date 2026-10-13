import type { AdjustmentName, AdjustmentState } from './types';

export const SLIDER_MIN = -100;
export const SLIDER_MAX = 100;

export function clampSlider(value: number): number {
  return Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, Math.round(value)));
}

/**
 * Maps a slider value (-100..100) to the range the corresponding Fabric
 * filter expects. Hue is mapped to degrees (-360..360); everything else
 * maps linearly to -1..1.
 */
export function sliderToFilterValue(name: AdjustmentName, slider: number): number {
  const v = clampSlider(slider) / 100;
  switch (name) {
    case 'hue':
      return v * 360;
    default:
      return v;
  }
}

export function isNeutralAdjustments(a: AdjustmentState): boolean {
  return (Object.keys(a) as AdjustmentName[]).every((key) => a[key] === 0);
}

export function mergeAdjustment(
  current: AdjustmentState,
  name: AdjustmentName,
  value: number,
): AdjustmentState {
  return { ...current, [name]: clampSlider(value) };
}
