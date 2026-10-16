import { describe, expect, it } from 'vitest';
 import { executeToolCall, type EditorApi } from './tools';
 import type { TextOverlay } from '../editor/types';

function mockApi(): EditorApi & { calls: string[] } {
   const calls: string[] = [];
   const record = (name: string) => calls.push(name);
   return {
     calls,
     setAdjustment: (name, value) => record(`adjust:${name}=${String(value)}`),
     applyFilter: (filter) => record(`filter:${filter}`),
     crop: (x, y, w, h) => record(`crop:${String(x)},${String(y)},${String(w)},${String(h)}`),
     cropToAspect: (aspect) => record(`cropaspect:${aspect}`),
     rotate: (d) => record(`rotate:${String(d)}`),
     flip: (axis) => record(`flip:${axis}`),
     resize: (w, h) => record(`resize:${String(w)}x${String(h)}`),
     autoEnhance: () => record('autoEnhance'),
     reset: () => record('reset'),
     exportImage: () => {
       record('export');
       return Promise.resolve('data:image/png;base64,xx');
     },
     getSnapshot: () => ({
       adjustments: { brightness: 0, contrast: 0, saturation: 0, hue: 0, temperature: 0 },
       filter: 'none',
       transform: { rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1 },
       crop: null,
     }),
     getImageInfo: () => ({ width: 1920, height: 1080 }),
     applyPreset: (presetId) => {
       record(`applyPreset:${presetId}`);
       return true;
     },
     clearCrop: () => record('clearCrop'),
     addTextOverlay: (overlay) => {
       record(`addText:${overlay.text}`);
       return overlay.id;
     },
     updateTextOverlay: (id, _updates) => {
       record(`updateText:${id}`);
       return true;
     },
     removeTextOverlay: (id) => {
       record(`removeText:${id}`);
       return true;
     },
   };
 }

describe('executeToolCall', () => {
  it('executes adjust with a clamped value', async () => {
    const api = mockApi();
    const result = await executeToolCall(api, {
      id: '1',
      name: 'adjust',
      arguments: { name: 'brightness', value: 250 },
    });
    expect(result.success).toBe(true);
    expect(api.calls).toContain('adjust:brightness=100');
  });

  it('rejects an unknown adjustment', async () => {
    const api = mockApi();
    const result = await executeToolCall(api, {
      id: '1',
      name: 'adjust',
      arguments: { name: 'warmth', value: 10 },
    });
    expect(result.success).toBe(false);
    expect(api.calls).toHaveLength(0);
  });

  it('applies filters, crop, rotate, flip and resize', async () => {
    const api = mockApi();
    await executeToolCall(api, {
      id: '1',
      name: 'apply_filter',
      arguments: { filter: 'vintage' },
    });
    await executeToolCall(api, {
      id: '2',
      name: 'crop',
      arguments: { x: 10, y: 20, width: 100, height: 200 },
    });
    await executeToolCall(api, {
      id: '3',
      name: 'rotate',
      arguments: { degrees: 90 },
    });
    await executeToolCall(api, {
      id: '4',
      name: 'flip',
      arguments: { axis: 'y' },
    });
    await executeToolCall(api, {
      id: '5',
      name: 'resize',
      arguments: { width: 800, height: 600 },
    });
    expect(api.calls).toEqual([
      'filter:vintage',
      'crop:10,20,100,200',
      'rotate:90',
      'flip:y',
      'resize:800x600',
    ]);
  });

  it('exports the image', async () => {
    const api = mockApi();
    const result = await executeToolCall(api, {
      id: '1',
      name: 'export_image',
      arguments: { format: 'jpeg', quality: 0.5 },
    });
    expect(result.success).toBe(true);
    expect(api.calls).toContain('export');
  });

  it('resets the photo', async () => {
    const api = mockApi();
    const result = await executeToolCall(api, {
      id: '1',
      name: 'reset',
      arguments: {},
    });
    expect(result.success).toBe(true);
    expect(api.calls).toContain('reset');
  });

  it('handles unknown tools', async () => {
    const api = mockApi();
    const result = await executeToolCall(api, {
      id: '1',
      name: 'nope',
      arguments: {},
    });
    expect(result.success).toBe(false);
  });

  it('reports image dimensions', async () => {
    const api = mockApi();
    const result = await executeToolCall(api, {
      id: '1',
      name: 'get_image_info',
      arguments: {},
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain('1920x1080');
  });

  it('applies a preset', async () => {
    const api = mockApi();
    const result = await executeToolCall(api, {
      id: '1',
      name: 'apply_preset',
      arguments: { preset: 'portrait-warm' },
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain('Portrait Warm');
    expect(api.calls).toContain('applyPreset:portrait-warm');
  });

  it('rejects an unknown preset', async () => {
    const api = mockApi();
    const result = await executeToolCall(api, {
      id: '1',
      name: 'apply_preset',
      arguments: { preset: 'nope' },
    });
    expect(result.success).toBe(false);
    expect(api.calls).toHaveLength(0);
  });

  it('clears the crop', async () => {
    const api = mockApi();
    const result = await executeToolCall(api, {
      id: '1',
      name: 'clear_crop',
      arguments: {},
    });
    expect(result.success).toBe(true);
    expect(api.calls).toContain('clearCrop');
  });

  it('adds a text overlay with clamped position', async () => {
    const api = mockApi();
    const result = await executeToolCall(api, {
      id: '1',
      name: 'add_text',
      arguments: { text: 'Hello', x: -50, y: 999, fontSize: 8, color: 123, bold: 'yes' },
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain('Hello');
    expect(api.calls).toContain('addText:Hello');
  });

  it('updates an existing text overlay', async () => {
    const api = mockApi();
    const result = await executeToolCall(api, {
      id: '1',
      name: 'update_text',
      arguments: { id: 'text-1', text: 'World', opacity: 0.5 },
    });
    expect(result.success).toBe(true);
    expect(api.calls).toContain('updateText:text-1');
  });

  it('reports a missing text overlay', async () => {
    const api = mockApi();
    const result = await executeToolCall(api, {
      id: '1',
      name: 'update_text',
      arguments: { id: 'missing' },
    });
    expect(result.success).toBe(false);
    expect(api.calls).toHaveLength(0);
  });

  it('removes a text overlay', async () => {
    const api = mockApi();
    const result = await executeToolCall(api, {
      id: '1',
      name: 'remove_text',
      arguments: { id: 'text-9' },
    });
    expect(result.success).toBe(true);
    expect(api.calls).toContain('removeText:text-9');
  });

  it('returns a valid TextOverlay shape from add_text', async () => {
    const overlays: TextOverlay[] = [];
    const api: EditorApi = {
      ...mockApi(),
      addTextOverlay: (overlay) => {
        overlays.push(overlay);
        return overlay.id;
      },
    };
    const result = await executeToolCall(api, {
      id: '1',
      name: 'add_text',
      arguments: { text: 'Caption', x: 25, y: 30, fontSize: 64, color: '#ff0000', bold: true },
    });
    expect(result.success).toBe(true);
    expect(overlays).toHaveLength(1);
    const o = overlays[0];
    expect(o.text).toBe('Caption');
    expect(o.x).toBe(25);
    expect(o.y).toBe(30);
    expect(o.fontSize).toBe(64);
    expect(o.color).toBe('#ff0000');
    expect(o.bold).toBe(true);
    expect(o.italic).toBe(false);
    expect(o.opacity).toBe(1);
    expect(o.rotation).toBe(0);
    expect(o.fontFamily).toBe('sans-serif');
    expect(o.id).toBeTruthy();
  });
});
