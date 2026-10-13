import { describe, expect, it } from 'vitest';
import {
  formatModelOption,
  modelSupportsVision,
  parseModelsResponse,
  sortModels,
} from './models';

const raw = {
  data: [
    {
      id: 'google/gemini-2.0-flash-exp:free',
      name: 'Google: Gemini 2.0 Flash',
      context_length: 1048576,
      pricing: { prompt: '0', completion: '0' },
      architecture: { input_modalities: ['text', 'image'] },
    },
    {
      id: 'openai/gpt-4o',
      name: 'OpenAI: GPT-4o',
      context_length: 128000,
      pricing: { prompt: '0.0025', completion: '0.01' },
      architecture: { input_modalities: ['text', 'image'] },
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct:free',
      name: 'Meta: Llama 3.3 70B',
      architecture: { input_modalities: ['text'] },
    },
    { id: 'broken/model', name: 42 },
    'not-an-object',
  ],
};

describe('parseModelsResponse', () => {
  it('parses valid models and flags vision, free, and pricing', () => {
    const models = parseModelsResponse(raw);
    expect(models).toHaveLength(4);

    const gemini = models[0];
    expect(gemini.provider).toBe('google');
    expect(gemini.vision).toBe(true);
    expect(gemini.free).toBe(true);
    expect(gemini.contextLength).toBe(1048576);
    expect(gemini.promptPrice).toBe(0);
    expect(gemini.completionPrice).toBe(0);

    const gpt = models[1];
    expect(gpt.provider).toBe('openai');
    expect(gpt.free).toBe(false);
    expect(gpt.vision).toBe(true);
    expect(gpt.promptPrice).toBe(0.0025);
    expect(gpt.completionPrice).toBe(0.01);

    const llama = models[2];
    expect(llama.vision).toBe(false);
    expect(llama.contextLength).toBeNull();
    expect(llama.promptPrice).toBeNull();

    expect(models[3].name).toBe('broken/model');
  });

  it('returns an empty list for invalid payloads', () => {
    expect(parseModelsResponse(null)).toEqual([]);
    expect(parseModelsResponse(undefined)).toEqual([]);
    expect(parseModelsResponse({})).toEqual([]);
    expect(parseModelsResponse({ data: 'nope' })).toEqual([]);
  });
});

describe('modelSupportsVision', () => {
  it('reports vision support, false for text-only, null when unknown', () => {
    const models = parseModelsResponse(raw);
    expect(
      modelSupportsVision(models, 'google/gemini-2.0-flash-exp:free'),
    ).toBe(true);
    expect(
      modelSupportsVision(models, 'meta-llama/llama-3.3-70b-instruct:free'),
    ).toBe(false);
    expect(modelSupportsVision(models, 'unknown/model')).toBeNull();
    expect(modelSupportsVision(null, 'google/gemini-2.0-flash-exp:free')).toBeNull();
  });
});

describe('sortModels', () => {
  it('puts free vision models first, then free, then paid', () => {
    const sorted = sortModels(parseModelsResponse(raw));
    expect(sorted[0]?.id).toBe('google/gemini-2.0-flash-exp:free');
    expect(sorted[1]?.id).toBe('meta-llama/llama-3.3-70b-instruct:free');
    expect(sorted[2]?.id).toBe('openai/gpt-4o');
  });
});

describe('formatModelOption', () => {
  it('builds a readable label', () => {
    const [gemini] = parseModelsResponse(raw);
    expect(gemini).toBeDefined();
    expect(formatModelOption(gemini)).toBe(
      'Google: Gemini 2.0 Flash · free · vision · 1049K ctx',
    );
  });
});
