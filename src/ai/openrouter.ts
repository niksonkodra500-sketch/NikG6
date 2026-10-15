export type ContentPart =
  { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentPart[];
  tool_calls?: AssistantToolCall[];
  tool_call_id?: string;
}

export interface AssistantToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: AssistantToolCall[];
    };
    finish_reason?: string;
  }>;
  error?: { message?: string; code?: number | string };
}

export const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_MODEL = 'google/gemma-3-27b-it';

export const MODEL_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'google/gemma-3-27b-it', label: 'Gemma 3 27B (vision, reasoning) ★ DEFAULT' },
  { id: 'google/gemma-3-12b-it', label: 'Gemma 3 12B (vision, fast)' },
  { id: 'google/gemma-3-4b-it', label: 'Gemma 3 4B (vision, fastest)' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini (paid, vision)' },
  { id: 'openai/gpt-4o', label: 'GPT-4o (paid, vision)' },
  {
    id: 'dots-studio/dots-3-note-preview:free',
    label: 'Dots3-Note Preview (free, reasoning, 512K ctx)',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    label: 'Llama 3.3 70B (free, no vision, best text)',
  },
  { id: 'llava:7b', label: 'LLaVA 7B (local Ollama, vision)' },
  { id: 'llava:13b', label: 'LLaVA 13B (local Ollama, vision)' },
  { id: 'llava:34b', label: 'LLaVA 34B (local Ollama, vision)' },
  { id: 'llama3.1:70b', label: 'Llama 3.1 70B (local Ollama, best general)' },
  { id: 'llama3.1:405b', label: 'Llama 3.1 405B (local Ollama, largest)' },
  { id: 'qwen2.5:72b', label: 'Qwen 2.5 72B (local Ollama, strong reasoning)' },
  { id: 'qwen2.5:14b', label: 'Qwen 2.5 14B (local Ollama, efficient)' },
  { id: 'nemotron3:70b', label: 'Nemotron 3 Ultra 70B (local Ollama, NVIDIA)' },
  { id: 'mistral-large:123b', label: 'Mistral Large 123B (local Ollama, strong)' },
  { id: 'command-r-plus:104b', label: 'Command R+ 104B (local Ollama, RAG-optimized)' },
];

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true },
    );
  });
}

async function postChatCompletion(options: {
  baseUrl: string;
  model: string;
  apiKey: string;
  messages: ChatMessage[];
  tools?: unknown[];
  signal?: AbortSignal;
}): Promise<ChatCompletionResponse> {
  let response: Response;
  try {
    response = await fetch(`${options.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
        'HTTP-Referer': 'https://nikg6-photo-editor.local',
        'X-Title': 'NikG6 Photo Editor',
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        tools: options.tools,
        tool_choice: 'auto',
      }),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new OpenRouterError(
      'Cannot reach the AI service. Check your connection.',
      undefined,
      true,
    );
  }

  if (!response.ok) {
    let detail = `HTTP ${String(response.status)}`;
    try {
      const body = (await response.json()) as ChatCompletionResponse;
      if (body.error?.message) detail = body.error.message;
    } catch {
      // keep the status-based detail
    }
    if (response.status === 401 || response.status === 403) {
      throw new OpenRouterError(
        'Invalid API key. Update it in the assistant settings.',
        response.status,
      );
    }
    throw new OpenRouterError(
      `AI service error (${options.model}): ${detail}`,
      response.status,
      RETRYABLE_STATUS.has(response.status),
    );
  }

  return (await response.json()) as ChatCompletionResponse;
}

export async function requestChatCompletion(options: {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  messages: ChatMessage[];
  tools?: unknown[];
  signal?: AbortSignal;
}): Promise<ChatCompletionResponse> {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = options.model ?? DEFAULT_MODEL;

  let lastError: OpenRouterError | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 0, options.signal);
    }
    try {
      return await postChatCompletion({ ...options, baseUrl, model });
    } catch (error) {
      if (error instanceof OpenRouterError && error.retryable) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw (
    lastError ??
    new OpenRouterError(`AI service error (${model}): request failed`, undefined, false)
  );
}
