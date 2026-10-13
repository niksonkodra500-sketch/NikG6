import { DEFAULT_BASE_URL, OpenRouterError } from './openrouter';

export interface CatalogModel {
  id: string;
  name: string;
  provider: string;
  vision: boolean;
  free: boolean;
  contextLength: number | null;
  promptPrice: number | null;
  completionPrice: number | null;
}

function parsePrice(value: unknown): number | null {
  if (typeof value !== 'string' || value === '') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseModelsResponse(raw: unknown): CatalogModel[] {
  const data = (raw as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return [];

  const models: CatalogModel[] = [];
  for (const entry of data) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : '';
    if (!id) continue;

    const name =
      typeof record.name === 'string' && record.name ? record.name : id;
    const architecture =
      (record.architecture as { input_modalities?: unknown } | undefined) ?? {};
    const modalities = Array.isArray(architecture.input_modalities)
      ? architecture.input_modalities
      : [];
    const pricing =
      (record.pricing as { prompt?: unknown; completion?: unknown } | undefined) ??
      {};

    models.push({
      id,
      name,
      provider: id.split('/')[0] ?? id,
      vision: modalities.some((modality) => modality === 'image'),
      free: id.endsWith(':free'),
      contextLength:
        typeof record.context_length === 'number' ? record.context_length : null,
      promptPrice: parsePrice(pricing.prompt),
      completionPrice: parsePrice(pricing.completion),
    });
  }
  return models;
}

export function modelSupportsVision(
  models: CatalogModel[] | null,
  modelId: string,
): boolean | null {
  if (!models) return null;
  const match = models.find((model) => model.id === modelId);
  return match ? match.vision : null;
}

export function sortModels(models: CatalogModel[]): CatalogModel[] {
  return [...models].sort((a, b) => {
    if (a.free !== b.free) return a.free ? -1 : 1;
    if (a.vision !== b.vision) return a.vision ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function formatModelOption(model: CatalogModel): string {
  const parts = [model.name];
  if (model.free) parts.push('free');
  if (model.vision) parts.push('vision');
  if (model.contextLength) {
    parts.push(`${Math.round(model.contextLength / 1000)}K ctx`);
  }
  return parts.join(' · ');
}

export async function fetchModels(baseUrl?: string): Promise<CatalogModel[]> {
  const base = (baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');

  let response: Response;
  try {
    response = await fetch(`${base}/models`);
  } catch {
    throw new OpenRouterError('Cannot reach the model catalog. Check your connection.');
  }

  if (!response.ok) {
    throw new OpenRouterError(
      `Model catalog error: HTTP ${String(response.status)}`,
      response.status,
    );
  }

  const raw = (await response.json()) as unknown;
  return sortModels(parseModelsResponse(raw));
}
