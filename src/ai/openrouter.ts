export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

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
export const DEFAULT_MODEL = 'google/gemini-2.0-flash-exp:free';

export const MODEL_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'thinkingmachines/inkling:free', label: 'Inkling (free, vision, reasoning, 1M ctx) ★ BEST FREE VISION+REASONING' },
  { id: 'thinkingmachines/inkling-small:free', label: 'Inkling Small (free, vision, reasoning, 1M ctx)' },
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B (free, vision, video, reasoning)' },
  { id: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B (free, vision, video, reasoning)' },
  { id: 'qwen/qwen3.8-27b:free', label: 'Qwen3.8 27B (free, vision, video)' },
  { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', label: 'Nemotron 3 Nano Omni (free, vision, audio, video, reasoning)' },
  { id: 'dots-studio/dots-3-note-preview:free', label: 'Dots3-Note Preview (free, vision, 512K ctx)' },
  { id: 'deepseek/deepseek-v4-flash-vision-exp:free', label: 'DeepSeek V4 Flash Vision (free, vision, reasoning)' },
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (free, vision) ★ RELIABLE' },
  { id: 'google/gemini-2.0-flash-lite:free', label: 'Gemini 2.0 Flash Lite (free, vision)' },
  { id: 'meta-llama/llama-3.2-90b-vision-instruct:free', label: 'Llama 3.2 90B Vision (free, vision)' },
  { id: 'qwen/qwen2.5-vl-72b-instruct:free', label: 'Qwen 2.5 VL 72B (free, vision)' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free, no vision, best text)' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini (paid, vision)' },
  { id: 'openai/gpt-4o', label: 'GPT-4o (paid, vision)' },
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

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
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

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
        'HTTP-Referer': 'https://nikg6-photo-editor.local',
        'X-Title': 'NikG6 Photo Editor',
      },
      body: JSON.stringify({
        model: options.model ?? DEFAULT_MODEL,
        messages: options.messages,
        tools: options.tools,
        tool_choice: 'auto',
      }),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new OpenRouterError('Cannot reach the AI service. Check your connection.');
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
      throw new OpenRouterError('Invalid API key. Update it in the assistant settings.', response.status);
    }
    throw new OpenRouterError(`AI service error: ${detail}`, response.status);
  }

  return (await response.json()) as ChatCompletionResponse;
}
