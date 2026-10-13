import { afterEach, describe, expect, it, vi } from 'vitest';
import { runAssistantTurn } from './assistant';
import { DEFAULT_MODEL } from './openrouter';
import type { EditorApi } from './tools';

const editorApi = {} as EditorApi;
const messages = [{ role: 'user' as const, content: 'brightness up' }];

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('runAssistantTurn', () => {
  it('falls back to the default model when the selected model fails', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as { model: string };
        if (body.model === 'broken/model') {
          return jsonResponse(500, {
            error: { message: 'provider returned error' },
          });
        }
        return jsonResponse(200, {
          choices: [{ message: { role: 'assistant', content: 'Done!' } }],
        });
      },
    );
    vi.stubGlobal('fetch', fetchMock);

    const pending = runAssistantTurn({
      apiKey: 'key',
      model: 'broken/model',
      messages,
      visionEnabled: false,
      editorApi,
    });
    await vi.advanceTimersByTimeAsync(5000);
    const result = await pending;

    expect(result.reply).toContain('fallback');
    expect(result.reply).toContain('Done!');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('propagates authentication errors without fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(401, { error: { message: 'Invalid API key' } }),
      ),
    );
    await expect(
      runAssistantTurn({
        apiKey: 'bad',
        model: 'broken/model',
        messages,
        visionEnabled: false,
        editorApi,
      }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('uses the default model when none is selected', async () => {
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as { model: string };
        expect(body.model).toBe(DEFAULT_MODEL);
        return jsonResponse(200, {
          choices: [{ message: { role: 'assistant', content: 'ok' } }],
        });
      },
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await runAssistantTurn({
      apiKey: 'key',
      messages,
      visionEnabled: false,
      editorApi,
    });
    expect(result.reply).toBe('ok');
  });
});
