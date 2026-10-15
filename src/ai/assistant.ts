import { DEFAULT_MODEL, OpenRouterError, type ChatMessage } from './openrouter';
import { EDITOR_TOOLS, executeToolCall, type EditorApi, type ToolCallResult } from './tools';
import type { EditorSnapshot } from '../editor/types';
import { requestChatCompletion } from './openrouter';

export interface AssistantTurnResult {
  reply: string;
  toolCalls: ToolCallResult[];
  messages: ChatMessage[];
}

const MAX_TOOL_ROUNDS = 15;

/**
 * Runs one assistant turn: sends the conversation (optionally with the current
 * photo attached for vision), executes any tool calls the model makes, feeds
 * results back, and returns the final reply. Loops until the model stops
 * calling tools or MAX_TOOL_ROUNDS is reached.
 */
async function runTurn(options: {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  messages: ChatMessage[];
  /** Data URL of the current photo, attached when vision is enabled. */
  image?: string | null;
  visionEnabled: boolean;
  editorApi: EditorApi;
  signal?: AbortSignal;
}): Promise<AssistantTurnResult> {
  const conversation = [...options.messages];

  if (options.visionEnabled && options.image) {
    const last = conversation[conversation.length - 1] as ChatMessage | undefined;
    if (last && last.role === 'user' && typeof last.content === 'string') {
      last.content = [
        { type: 'text', text: last.content },
        { type: 'image_url', image_url: { url: options.image } },
      ];
    }
  }

  const toolCalls: ToolCallResult[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await requestChatCompletion({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      model: options.model,
      messages: conversation,
      tools: EDITOR_TOOLS,
      signal: options.signal,
    });

    const message = response.choices?.[0]?.message;
    if (!message) throw new Error('Empty response from the assistant');

    conversation.push({
      role: 'assistant',
      content: message.content ?? '',
      ...(message.tool_calls?.length ? { tool_calls: message.tool_calls } : {}),
    });

    const pending = message.tool_calls ?? [];
    if (pending.length === 0) {
      return {
        reply: typeof message.content === 'string' ? message.content : '',
        toolCalls,
        messages: conversation,
      };
    }

    for (const call of pending) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(call.function.arguments || '{}');
      } catch {
        parsed = {};
      }
      // Capture the editor state before the tool runs so the UI can offer
      // a one-tap "revert" for AI-made edits.
      let before: EditorSnapshot | undefined;
      try {
        before = options.editorApi.getSnapshot();
      } catch {
        before = undefined;
      }
      const result = await executeToolCall(options.editorApi, {
        id: call.id,
        name: call.function.name,
        arguments: parsed,
      });
      toolCalls.push({ ...result, revertSnapshot: before });
      conversation.push({
        role: 'tool',
        tool_call_id: call.id,
        content: result.message,
      });
    }
  }

  return {
    reply: 'I made several edits to your photo. Tell me if you would like anything else changed.',
    toolCalls,
    messages: conversation,
  };
}

/**
 * Runs one assistant turn. If the selected model fails for any reason
 * other than authentication (for example a temporary provider error),
 * the turn is retried with fallback models and the reply notes the fallback.
 */
export async function runAssistantTurn(options: {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  messages: ChatMessage[];
  /** Data URL of the current photo, attached when vision is enabled. */
  image?: string | null;
  visionEnabled: boolean;
  editorApi: EditorApi;
  signal?: AbortSignal;
}): Promise<AssistantTurnResult> {
  // Define fallback models in order of preference — paid models first,
  // then free models as last resort
  const fallbackModels = [
    options.model ?? DEFAULT_MODEL, // paid (gpt-4o by default)
    DEFAULT_MODEL, // paid (gpt-4o)
    'openai/gpt-4o-mini', // paid, cheaper fallback
    'google/gemini-2.0-flash-exp:free', // free vision fallback
    'thinkingmachines/inkling-small:free', // free reasoning fallback
  ].filter((model, index, self) => model && self.indexOf(model) === index); // Remove duplicates while preserving order

  let lastError: Error | null = null;

  // Try each model in sequence
  for (const model of fallbackModels) {
    try {
      const result = await runTurn({ ...options, model });
      // If we succeeded with a fallback model (not the first choice), note it in the reply
      if (model !== fallbackModels[0]) {
        return {
          ...result,
          reply: `The primary model was unavailable, so I used ${model.split('/')[0]}.\n\n${result.reply}`,
        };
      }
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      // Don't fall back on authentication errors
      if (error instanceof OpenRouterError && (error.status === 401 || error.status === 403)) {
        throw error;
      }
      lastError = error;
      // Continue to next fallback model
    }
  }

  // If all models failed, throw the last error
  throw lastError ?? new Error('All available models failed');
}
