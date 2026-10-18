import { describe, expect, it, vi } from 'vitest';

// Mock fabric module so fabric.filters is extensible for custom filter registration.
// Everything must be defined inside the factory because vi.mock is hoisted.
vi.mock('fabric', () => {
  const filters: Record<string, unknown> = {};
  class BaseFilter {
    constructor(options?: Record<string, unknown>) {
      if (options) Object.assign(this, options);
    }
  }
  filters.BaseFilter = BaseFilter;
  filters.Brightness = class Brightness {
    constructor(public brightness: number) {}
  };
  filters.Contrast = class Contrast {
    constructor(public contrast: number) {}
  };
  filters.Saturation = class Saturation {
    constructor(public saturation: number) {}
  };
  filters.HueRotation = class HueRotation {
    constructor(public rotation: number) {}
  };
  filters.Grayscale = class Grayscale {};
  filters.Sepia = class Sepia {};
  filters.Vintage = class Vintage {};
  filters.Polaroid = class Polaroid {};
  filters.Kodachrome = class Kodachrome {};
  filters.BlendColor = class BlendColor {
    constructor(public opts: { color: string; mode: string; alpha: number }) {}
  };
  filters.Blur = class Blur {
    constructor(public blur: number) {}
  };
  filters.Convolute = class Convolute {
    constructor(public opts: { matrix: number[]; opaque: boolean }) {}
  };
  return { filters };
});

import { TemperatureFilter, buildFabricFilters } from './fabricFilters';
import type { AdjustmentState } from './types';

function makeImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 100;
    data[i + 1] = 100;
    data[i + 2] = 100;
    data[i + 3] = 255;
  }
  return { data, width, height, colorSpace: 'srgb' };
}

describe('TemperatureFilter', () => {
  it('warms the image with positive temperature', () => {
    const filter = new TemperatureFilter({ temperature: 0.5 });
    const imageData = makeImageData(1, 1);
    filter.applyTo2d({ imageData });
    expect(imageData.data[0]).toBe(148);
    expect(imageData.data[1]).toBe(112);
    expect(imageData.data[2]).toBe(52);
  });

  it('cools the image with negative temperature', () => {
    const filter = new TemperatureFilter({ temperature: -0.5 });
    const imageData = makeImageData(1, 1);
    filter.applyTo2d({ imageData });
    expect(imageData.data[0]).toBe(52);
    expect(imageData.data[1]).toBe(88);
    expect(imageData.data[2]).toBe(148);
  });

  it('clamps RGB to [0, 255]', () => {
    const filter = new TemperatureFilter({ temperature: 2 });
    const imageData = makeImageData(1, 1);
    filter.applyTo2d({ imageData });
    expect(imageData.data[0]).toBe(255);
    expect(imageData.data[1]).toBe(148);
    expect(imageData.data[2]).toBe(0);
  });

  it('zero temperature leaves pixels unchanged', () => {
    const filter = new TemperatureFilter({ temperature: 0 });
    const imageData = makeImageData(2, 2);
    filter.applyTo2d({ imageData });
    for (let i = 0; i < imageData.data.length; i += 4) {
      expect(imageData.data[i]).toBe(100);
      expect(imageData.data[i + 1]).toBe(100);
      expect(imageData.data[i + 2]).toBe(100);
      expect(imageData.data[i + 3]).toBe(255);
    }
  });

  it('processes multiple pixels', () => {
    const filter = new TemperatureFilter({ temperature: 1 });
    const imageData = makeImageData(2, 1);
    filter.applyTo2d({ imageData });
    expect(imageData.data[0]).toBe(196);
    expect(imageData.data[1]).toBe(124);
    expect(imageData.data[2]).toBe(4);
    expect(imageData.data[4]).toBe(196);
    expect(imageData.data[5]).toBe(124);
    expect(imageData.data[6]).toBe(4);
  });

  it('serializes and restores state', async () => {
    const filter = new TemperatureFilter({ temperature: 0.75 });
    const obj = filter.toObject();
    expect(obj.temperature).toBe(0.75);
    expect(obj.type).toBe('Temperature');

    const restored = await TemperatureFilter.fromObject(obj);
    expect(restored.temperature).toBe(0.75);
  });

  it('defaults temperature to 0', () => {
    const filter = new TemperatureFilter();
    expect(filter.temperature).toBe(0);
  });
});

describe('buildFabricFilters', () => {
  const neutralAdjustments: AdjustmentState = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    temperature: 0,
  };

  it('returns empty array for neutral adjustments and none filter', () => {
    const filters = buildFabricFilters(neutralAdjustments, 'none');
    expect(filters).toHaveLength(0);
  });

  it('creates brightness filter', () => {
    const filters = buildFabricFilters(
      { ...neutralAdjustments, brightness: 50 },
      'none',
    );
    expect(filters).toHaveLength(1);
  });

  it('creates contrast filter', () => {
    const filters = buildFabricFilters(
      { ...neutralAdjustments, contrast: -30 },
      'none',
    );
    expect(filters).toHaveLength(1);
  });

  it('creates saturation filter', () => {
    const filters = buildFabricFilters(
      { ...neutralAdjustments, saturation: 40 },
      'none',
    );
    expect(filters).toHaveLength(1);
  });

  it('creates hue rotation filter', () => {
    const filters = buildFabricFilters(
      { ...neutralAdjustments, hue: 25 },
      'none',
    );
    expect(filters).toHaveLength(1);
  });

  it('creates temperature filter', () => {
    const filters = buildFabricFilters(
      { ...neutralAdjustments, temperature: 10 },
      'none',
    );
    expect(filters).toHaveLength(1);
  });

  it('skips zero adjustments', () => {
    const adjustments: AdjustmentState = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      temperature: 0,
    };
    const filters = buildFabricFilters(adjustments, 'none');
    expect(filters).toHaveLength(0);
  });

  it('applies grayscale filter', () => {
    const filters = buildFabricFilters(neutralAdjustments, 'grayscale');
    expect(filters).toHaveLength(1);
  });

  it('applies sepia filter', () => {
    const filters = buildFabricFilters(neutralAdjustments, 'sepia');
    expect(filters).toHaveLength(1);
  });

  it('applies vintage filter', () => {
    const filters = buildFabricFilters(neutralAdjustments, 'vintage');
    expect(filters).toHaveLength(1);
  });

  it('applies polaroid filter', () => {
    const filters = buildFabricFilters(neutralAdjustments, 'polaroid');
    expect(filters).toHaveLength(1);
  });

  it('applies kodachrome filter', () => {
    const filters = buildFabricFilters(neutralAdjustments, 'kodachrome');
    expect(filters).toHaveLength(1);
  });

  it('applies dramatic filter (contrast + brightness)', () => {
    const filters = buildFabricFilters(neutralAdjustments, 'dramatic');
    expect(filters).toHaveLength(2);
  });

  it('applies cool filter', () => {
    const filters = buildFabricFilters(neutralAdjustments, 'cool');
    expect(filters).toHaveLength(1);
  });

  it('applies warm filter', () => {
    const filters = buildFabricFilters(neutralAdjustments, 'warm');
    expect(filters).toHaveLength(1);
  });

  it('applies blur filter', () => {
    const filters = buildFabricFilters(neutralAdjustments, 'blur');
    expect(filters).toHaveLength(1);
  });

  it('applies sharpen filter', () => {
    const filters = buildFabricFilters(neutralAdjustments, 'sharpen');
    expect(filters).toHaveLength(1);
  });

  it('combines adjustments and filter', () => {
    const filters = buildFabricFilters(
      { ...neutralAdjustments, brightness: 20, contrast: 10 },
      'sepia',
    );
    expect(filters).toHaveLength(3);
  });
});
