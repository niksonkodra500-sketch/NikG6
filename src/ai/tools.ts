import {
  clampNumber,
  clampPositiveInt,
  clampPositiveNumber,
  clampSliderArg,
  clampAspectRatio,
  isAdjustmentName,
  isExportFormat,
  isFilterName,
  parseRotationArg,
} from '../editor/commands';
import type {
  AdjustmentName,
  CropAspect,
  EditorSnapshot,
  ExportFormat,
  FilterName,
  TextOverlay,
} from '../editor/types';

/** The set of editing operations the AI assistant can invoke. */
export interface EditorApi {
  setAdjustment(name: AdjustmentName, value: number): void;
  applyFilter(filter: FilterName): void;
  crop(x: number, y: number, width: number, height: number, aspect?: number | null): void;
  cropToAspect?(aspect: CropAspect): void;
  rotate(degrees: number): void;
  flip(axis: 'x' | 'y'): void;
  resize(width: number, height: number): void;
  autoEnhance(): void;
  reset(): void;
  exportImage(format: ExportFormat, quality: number): Promise<string>;
  /** Current editor snapshot, used to capture pre-tool state for undo. */
  getSnapshot(): EditorSnapshot;
  getImageInfo?(): { width: number; height: number } | null;
  applyPreset?(presetId: string): boolean;
  clearCrop?(): void;
  addTextOverlay?(overlay: TextOverlay): string;
  updateTextOverlay?(id: string, updates: Partial<TextOverlay>): boolean;
  removeTextOverlay?(id: string): boolean;
}

export interface ToolParameterSchema {
  type: string;
  description?: string;
  enum?: string[] | number[];
  minimum?: number;
  maximum?: number;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, ToolParameterSchema>;
      required?: string[];
    };
  };
}

export const EDITOR_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'adjust',
      description:
        'Adjust brightness, contrast, saturation, hue or temperature. Value ranges from -100 to 100.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            enum: ['brightness', 'contrast', 'saturation', 'hue', 'temperature'],
          },
          value: { type: 'number', minimum: -100, maximum: 100 },
        },
        required: ['name', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apply_filter',
      description: 'Apply a preset filter to the photo.',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            enum: [
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
            ],
          },
        },
        required: ['filter'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'crop',
      description: 'Crop the photo to a rectangle (pixels, relative to the original image).',
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'number', minimum: 0 },
          y: { type: 'number', minimum: 0 },
          width: { type: 'number', minimum: 1 },
          height: { type: 'number', minimum: 1 },
          aspect: { type: 'number', minimum: 0.01, description: 'Optional aspect ratio constraint (e.g. 1 for 1:1, 1.777 for 16:9). Omit for freeform.' },
        },
        required: ['x', 'y', 'width', 'height'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rotate',
      description: 'Rotate the photo by a multiple of 90 degrees.',
      parameters: {
        type: 'object',
        properties: {
          degrees: { type: 'number', enum: [-180, -90, 90, 180, 270] },
        },
        required: ['degrees'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'flip',
      description: 'Flip the photo horizontally (x) or vertically (y).',
      parameters: {
        type: 'object',
        properties: { axis: { type: 'string', enum: ['x', 'y'] } },
        required: ['axis'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'resize',
      description: 'Resize the photo to the given dimensions in pixels.',
      parameters: {
        type: 'object',
        properties: {
          width: { type: 'number', minimum: 1 },
          height: { type: 'number', minimum: 1 },
        },
        required: ['width', 'height'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'export_image',
      description: 'Export the edited photo. Only use when the user asks to save or export.',
      parameters: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
          quality: { type: 'number', minimum: 0.1, maximum: 1 },
        },
        required: ['format'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'crop_to_aspect',
      description:
        'Crop the photo to a preset aspect ratio (free, 1:1, 4:3, 3:2, 16:9, or 9:16), centered on the image. Use this for "crop to a square" or "crop to 16:9".',
      parameters: {
        type: 'object',
        properties: {
          aspect: {
            type: 'string',
            enum: ['free', '1:1', '4:3', '3:2', '16:9', '9:16'],
          },
        },
        required: ['aspect'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'auto_enhance',
      description:
        'Apply automatic photo enhancement: improves brightness, contrast, saturation and color temperature for a more vibrant look.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reset',
      description: 'Reset the photo to its original state, discarding all edits.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: unknown;
}

export interface ToolCallResult {
  id: string;
  name: string;
  success: boolean;
  message: string;
  /** Editor snapshot captured before the tool ran, so the UI can undo it. */
}

const PRESET_NAMES: Record<string, string> = {
  'portrait-warm': 'Portrait Warm',
  'cinematic-cool': 'Cinematic Cool',
  'vintage-film': 'Vintage Film',
  'high-contrast': 'High Contrast',
  'soft-glow': 'Soft Glow',
};

function ok(request: ToolCallRequest, message: string): ToolCallResult {
  return { id: request.id, name: request.name, success: true, message };
}

function fail(request: ToolCallRequest, message: string): ToolCallResult {
  return { id: request.id, name: request.name, success: false, message };
}

/** Validates a tool call against the EditorApi and executes it. Pure w.r.t. the API. */
export async function executeToolCall(
  api: EditorApi,
  request: ToolCallRequest,
): Promise<ToolCallResult> {
  const args = (request.arguments ?? {}) as Record<string, unknown>;
  try {
    switch (request.name) {
      case 'adjust': {
        const name = args.name;
        if (!isAdjustmentName(name)) {
          return fail(request, `Unknown adjustment: ${String(name)}`);
        }
        const value = clampSliderArg(args.value);
        api.setAdjustment(name, value);
        return ok(request, `Set ${name} to ${String(value)}`);
      }
      case 'apply_filter': {
        const filter = args.filter;
        if (!isFilterName(filter)) {
          return fail(request, `Unknown filter: ${String(filter)}`);
        }
        api.applyFilter(filter);
        return ok(request, `Applied the ${filter} filter`);
      }
      case 'crop': {
        const x = clampNumber(args.x, 0, 1_000_000, 0);
        const y = clampNumber(args.y, 0, 1_000_000, 0);
        const width = clampPositiveInt(args.width, 0);
        const height = clampPositiveInt(args.height, 0);
        if (!width || !height) return fail(request, 'Crop width and height must be positive');
        const aspect = clampAspectRatio(args.aspect, 0);
        api.crop(x, y, width, height, aspect || null);
        return ok(
          request,
          `Cropped to ${String(width)}x${String(height)} at (${String(Math.round(x))}, ${String(Math.round(y))})`,
        );
      }
      case 'crop_to_aspect': {
        const validAspects: CropAspect[] = ['free', '1:1', '4:3', '3:2', '16:9', '9:16'];
        const aspect = validAspects.find((a) => a === args.aspect) ?? 'free';
        if (api.cropToAspect) api.cropToAspect(aspect);
        else {
          // fallback - best effort no-op
        }
        return ok(request, `Cropped to ${aspect === 'free' ? 'freeform' : aspect} aspect ratio`);
      }
      case 'rotate': {
        const degrees = parseRotationArg(args.degrees);
        api.rotate(degrees);
        return ok(request, `Rotated by ${String(degrees)} degrees`);
      }
      case 'flip': {
        const axis = args.axis === 'y' ? ('y' as const) : ('x' as const);
        api.flip(axis);
        return ok(request, axis === 'x' ? 'Flipped horizontally' : 'Flipped vertically');
      }
      case 'resize': {
        const width = clampPositiveInt(args.width, 0);
        const height = clampPositiveInt(args.height, 0);
        if (!width || !height) return fail(request, 'Resize width and height must be positive');
        api.resize(width, height);
        return ok(request, `Resized to ${String(width)}x${String(height)}`);
      }
      case 'export_image': {
        const format = isExportFormat(args.format) ? args.format : 'png';
        const quality = clampPositiveNumber(args.quality, 0.92);
        await api.exportImage(format, quality);
        return ok(
          request,
          `Exported the photo as ${format.toUpperCase()} (quality ${String(quality)}).`,
        );
      }
      case 'auto_enhance': {
        api.autoEnhance();
        return ok(request, 'Auto-enhanced the photo (brightness, contrast, saturation, temperature)');
      }
      case 'reset': {
        api.reset();
        return ok(request, 'Reset the photo to its original state');
      }
      default:
        return fail(request, `Unknown tool: ${request.name}`);
    }
  } catch (error) {
    return fail(request, error instanceof Error ? error.message : String(error));
  }
}
