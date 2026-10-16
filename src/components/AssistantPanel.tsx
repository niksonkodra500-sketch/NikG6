import { useEffect, useMemo, useRef, useState } from 'react';
import { runAssistantTurn } from '../ai/assistant';
import {
  fetchModels,
  formatModelOption,
  modelSupportsVision,
  type CatalogModel,
} from '../ai/models';
import { MODEL_OPTIONS, type ChatMessage } from '../ai/openrouter';
import { PROMPT_PRESETS, SYSTEM_PROMPT } from '../ai/presets';
import type { EditorApi, ToolCallResult } from '../ai/tools';
import type { EditorSnapshot } from '../editor/types';

interface AssistantPanelProps {
  messages: ChatMessage[];
  lastToolResults: ToolCallResult[];
  apiKey: string;
  apiKeyIsDefault: boolean;
  model: string;
  visionEnabled: boolean;
  editorApi: EditorApi;
  getImageDataUrl: (maxSize?: number) => Promise<string | null>;
  onMessagesChange: (messages: ChatMessage[]) => void;
  onToolResultsChange: (results: ToolCallResult[]) => void;
  onModelChange: (model: string) => void;
  onVisionChange: (enabled: boolean) => void;
  onSaveApiKey: (key: string) => Promise<void>;
  onClearApiKey: () => Promise<void>;
  onNewChat: () => void;
  onRevert: (snap: EditorSnapshot) => void;
  onClose?: () => void;
}

function messageText(message: ChatMessage): string {
  if (typeof message.content === 'string') return message.content;
  return message.content.map((part) => (part.type === 'text' ? part.text : '')).join('');
}

export function AssistantPanel(props: AssistantPanelProps) {
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [catalog, setCatalog] = useState<CatalogModel[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchModels()
      .then((models) => {
        if (!cancelled) setCatalog(models);
      })
      .catch(() => {
        if (!cancelled) setCatalog(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const modelOptions = useMemo(() => {
    if (catalog && catalog.length > 0) {
      const options = catalog.map((model) => ({
        id: model.id,
        label: formatModelOption(model),
      }));
      if (!options.some((option) => option.id === props.model)) {
        options.unshift({ id: props.model, label: props.model });
      }
      return options;
    }
    return MODEL_OPTIONS;
  }, [catalog, props.model]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [props.messages, props.lastToolResults, pending]);

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || pending) return;
    if (props.visionEnabled) {
      const supportsVision = modelSupportsVision(catalog, props.model);
      if (supportsVision === false) {
        setError(
          'The selected model does not support image input. Turn off "Let the assistant see the photo" or choose a model marked "vision".',
        );
        return;
      }
    }
    const withSystem = [{ role: 'system' as const, content: SYSTEM_PROMPT }, ...props.messages];
    const userMessage: ChatMessage = { role: 'user', content: prompt };
    const next = [...withSystem, userMessage];
    props.onMessagesChange(next);
    setInput('');
    setPending(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      // Read the photo at full resolution (no size cap) so the assistant sees
      // the complete image for vision-based editing.
      const image = props.visionEnabled ? await props.getImageDataUrl(Infinity) : null;
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
    <div className="assistant-window">
      <div className="assistant-window-header">
        <h2>AI Assistant</h2>
        <button
          type="button"
          className="new-chat-btn"
          aria-label="New conversation"
          onClick={() => {
            void props.onNewChat();
          }}
          title="Start a new conversation"
        >
          ↻
        </button>
        {props.onClose && (
          <button
            type="button"
            className="close-btn"
            aria-label="Close assistant"
            onClick={props.onClose}
          >
            ×
          </button>
        )}
      </div>
      <div className="assistant-window-body assistant-panel">
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
                <div key={i} className="tool-result-row">
                  <span className={r.success ? 'tool-ok' : 'tool-fail'}>{r.message}</span>
                  {r.success && r.revertSnapshot && (
                    <button
                      type="button"
                      className="tool-revert"
                      onClick={() => props.onRevert(r.revertSnapshot!)}
                    >
                      Revert
                    </button>
                  )}
                </div>
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
        >
          {' '}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the assistant to edit your photo…"
            disabled={pending}
          />
          <button type="submit" disabled={pending}>
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
            Model
            <select value={props.model} onChange={(e) => props.onModelChange(e.target.value)}>
              {modelOptions.map((m) => (
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
            Let the assistant see the photo (requires a vision-capable model)
          </label>
          <div className="api-key-section">
            <label>
              OpenRouter API Key
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-or-…"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: 'var(--text)',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                style={{
                  padding: '6px 8px',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </label>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  const key = apiKeyInput.trim();
                  if (!key) return;
                  void props.onSaveApiKey(key);
                  setApiKeyInput('');
                }}
                disabled={!apiKeyInput.trim()}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: 'var(--text)',
                  cursor: apiKeyInput.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '0.85rem',
                  opacity: apiKeyInput.trim() ? 1 : 0.5,
                }}
              >
                Save key
              </button>
              <button
                type="button"
                onClick={() => {
                  void props.onClearApiKey();
                  setApiKeyInput('');
                }}
                disabled={!props.apiKeyIsDefault}
                style={{
                  padding: '6px 10px',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: 'var(--text-faint)',
                  cursor: props.apiKeyIsDefault ? 'pointer' : 'not-allowed',
                  fontSize: '0.85rem',
                  opacity: props.apiKeyIsDefault ? 1 : 0.5,
                }}
              >
                Reset to default
              </button>
            </div>
            {props.apiKeyIsDefault && (
              <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                Using the built-in default key. Enter your own OpenRouter key above so the assistant
                works under your account and avoids shared rate limits.
              </p>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
