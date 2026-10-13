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
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (free, vision)' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini (paid, vision)' },
  { id: 'openai/gpt-4o', label: 'GPT-4o (paid, vision)' },
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
    let detail = `HTTP ${response.status}`;
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
