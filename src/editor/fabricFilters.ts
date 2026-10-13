import * as fabric from 'fabric';
import { sliderToFilterValue } from './adjustments';
import type { AdjustmentName, AdjustmentState, FilterName } from './types';

/**
 * Custom temperature filter — Fabric has no built-in temperature control.
 * Positive values warm the image (more red, less blue); negative values cool it.
 */
export class TemperatureFilter extends fabric.Image.filters.BaseFilter {
  temperature = 0;

  constructor(options?: { temperature?: number }) {
    super();
    if (options?.temperature !== undefined) this.temperature = options.temperature;
  }

  applyTo2d(options: { imageData: ImageData }): void {
    const { data } = options.imageData;
    const t = this.temperature;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (t >= 0) {
        data[i] = Math.min(255, r + 96 * t);
        data[i + 1] = Math.min(255, g + 24 * t);
        data[i + 2] = Math.max(0, b - 96 * t);
      } else {
        const k = -t;
        data[i] = Math.max(0, r - 96 * k);
        data[i + 1] = Math.max(0, g - 24 * k);
        data[i + 2] = Math.min(255, b + 96 * k);
      }
    }
  }
}

/** Builds the Fabric filter stack for a snapshot's adjustments + preset filter. */
export function buildFabricFilters(
  adjustments: AdjustmentState,
  filter: FilterName,
): fabric.Image.filters.BaseFilter[] {
  const filters: fabric.Image.filters.BaseFilter[] = [];

  (Object.keys(adjustments) as AdjustmentName[]).forEach((name) => {
    const v = sliderToFilterValue(name, adjustments[name]);
    if (v === 0) return;
    switch (name) {
      case 'brightness':
        filters.push(new fabric.Image.filters.Brightness({ brightness: v }));
        break;
      case 'contrast':
        filters.push(new fabric.Image.filters.Contrast({ contrast: v }));
        break;
      case 'saturation':
        filters.push(new fabric.Image.filters.Saturation({ saturation: v }));
        break;
      case 'hue':
        filters.push(new fabric.Image.filters.HueRotation({ rotation: v }));
        break;
      case 'temperature':
        filters.push(new TemperatureFilter({ temperature: v }));
        break;
    }
  });

  switch (filter) {
    case 'grayscale':
      filters.push(new fabric.Image.filters.Grayscale());
      break;
    case 'sepia':
      filters.push(new fabric.Image.filters.Sepia());
      break;
    case 'vintage':
      filters.push(new fabric.Image.filters.Vintage());
      break;
    case 'polaroid':
      filters.push(new fabric.Image.filters.Polaroid());
      break;
    case 'kodachrome':
      filters.push(new fabric.Image.filters.Kodachrome());
      break;
    case 'dramatic':
      filters.push(new fabric.Image.filters.Contrast({ contrast: 0.35 }));
      filters.push(new fabric.Image.filters.Brightness({ brightness: -0.08 }));
      break;
    case 'cool':
      filters.push(new fabric.Image.filters.Tint({ color: '#3b82f6', opacity: 0.22 }));
      break;
    case 'warm':
      filters.push(new fabric.Image.filters.Tint({ color: '#f97316', opacity: 0.22 }));
      break;
    case 'blur':
      filters.push(new fabric.Image.filters.Blur({ blur: 0.35 }));
      break;
    case 'sharpen':
      filters.push(new fabric.Image.filters.Sharpen());
      break;
    case 'none':
      break;
  }

  return filters;
}
