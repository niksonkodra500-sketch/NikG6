import type { ChatMessage } from './openrouter';
import { EDITOR_TOOLS, executeToolCall, type EditorApi, type ToolCallResult } from './tools';
import { requestChatCompletion } from './openrouter';

export interface AssistantTurnResult {
  reply: string;
  toolCalls: ToolCallResult[];
  messages: ChatMessage[];
}

const MAX_TOOL_ROUNDS = 5;

/**
 * Runs one assistant turn: sends the conversation (optionally with the current
 * photo attached for vision), executes any tool calls the model makes, feeds
 * results back, and returns the final reply. Loops until the model stops
 * calling tools or MAX_TOOL_ROUNDS is reached.
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
      const result = await executeToolCall(options.editorApi, {
        id: call.id,
        name: call.function.name,
        arguments: parsed,
      });
      toolCalls.push(result);
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
