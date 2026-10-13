import { useEffect, useRef, useState } from 'react';
import { runAssistantTurn } from '../ai/assistant';
import { MODEL_OPTIONS, type ChatMessage } from '../ai/openrouter';
import { PROMPT_PRESETS, SYSTEM_PROMPT } from '../ai/presets';
import type { EditorApi, ToolCallResult } from '../ai/tools';

interface AssistantPanelProps {
  messages: ChatMessage[];
  lastToolResults: ToolCallResult[];
  apiKey: string | null;
  model: string;
  visionEnabled: boolean;
  editorApi: EditorApi;
  getImageDataUrl: (maxSize?: number) => Promise<string | null>;
  onMessagesChange: (messages: ChatMessage[]) => void;
  onToolResultsChange: (results: ToolCallResult[]) => void;
  onApiKeyChange: (key: string) => void;
  onModelChange: (model: string) => void;
  onVisionChange: (enabled: boolean) => void;
}

function messageText(message: ChatMessage): string {
  if (typeof message.content === 'string') return message.content;
  return message.content
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('');
}

export function AssistantPanel(props: AssistantPanelProps) {
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [props.messages, props.lastToolResults, pending]);

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || pending) return;
    if (!props.apiKey) {
      setError('Enter your OpenRouter API key below to enable the assistant.');
      return;
    }
    const withSystem = props.messages.some((m) => m.role === 'system')
      ? props.messages
      : [{ role: 'system' as const, content: SYSTEM_PROMPT }, ...props.messages];
    const userMessage: ChatMessage = { role: 'user', content: prompt };
    const next = [...withSystem, userMessage];
    props.onMessagesChange(next);
    setInput('');
    setPending(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const image = props.visionEnabled ? await props.getImageDataUrl(1024) : null;
      const result = await runAssistantTurn({
        apiKey: props.apiKey,
        model: props.model,
        messages: next,
        image,
        visionEnabled: props.visionEnabled,
        editorApi: props.editorApi,
        signal: controller.signal,
      });
      props.onMessagesChange(result.messages);
      props.onToolResultsChange(result.toolCalls);
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'The assistant failed');
    } finally {
      setPending(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="panel assistant-panel">
      <h2>AI Assistant</h2>
      <div className="assistant-log" ref={logRef}>
        {props.messages
          .filter((m) => m.role !== 'system' && m.role !== 'tool')
          .map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              {messageText(m)}
            </div>
          ))}
        {props.lastToolResults.length > 0 && (
          <div className="tool-results">
            {props.lastToolResults.map((r, i) => (
              <span key={i} className={r.success ? 'tool-ok' : 'tool-fail'}>
                {r.message}
              </span>
            ))}
          </div>
        )}
        {pending && <div className="message assistant">Thinking…</div>}
        {error && <div className="assistant-error">{error}</div>}
      </div>
      <div className="preset-row">
        {PROMPT_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              void send(p.prompt);
            }}
            disabled={pending}
          >
            {p.label}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the assistant to edit your photo…"
          disabled={pending}
        />
        <button type="submit" disabled={pending || !props.apiKey}>
          Send
        </button>
        {pending && (
          <button type="button" onClick={() => abortRef.current?.abort()}>
            Stop
          </button>
        )}
      </form>
      <details className="assistant-settings">
        <summary>Settings</summary>
        <label>
          OpenRouter API key
          <input
            type="password"
            value={props.apiKey ?? ''}
            onChange={(e) => props.onApiKeyChange(e.target.value)}
            placeholder="sk-or-…"
          />
        </label>
        <label>
          Model
          <select value={props.model} onChange={(e) => props.onModelChange(e.target.value)}>
            {MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="vision-toggle">
          <input
            type="checkbox"
            checked={props.visionEnabled}
            onChange={(e) => props.onVisionChange(e.target.checked)}
          />
          Let the assistant see the photo (uploaded to the AI provider)
        </label>
      </details>
    </div>
  );
}
