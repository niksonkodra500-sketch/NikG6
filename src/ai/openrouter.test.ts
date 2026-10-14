import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestChatCompletion } from './openrouter';

const messages = [{ role: 'user' as const, content: 'hello' }];

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function completion(content: string) {
  return { choices: [{ message: { role: 'assistant', content } }] };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('requestChatCompletion', () => {
  it('returns the completion on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(200, completion('hi')))),
    );
    const response = await requestChatCompletion({
      apiKey: 'key',
      messages,
    });
    expect(response.choices?.[0]?.message?.content).toBe('hi');
  });

  it('retries transient server errors and succeeds', async () => {
    vi.useFakeTimers();
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        calls += 1;
        if (calls === 1) {
          return Promise.resolve(
            jsonResponse(503, { error: { message: 'provider returned error' } }),
          );
        }
        return Promise.resolve(jsonResponse(200, completion('ok')));
      }),
    );
    const pending = requestChatCompletion({ apiKey: 'key', messages });
    await vi.advanceTimersByTimeAsync(1000);
    const response = await pending;
    expect(response.choices?.[0]?.message?.content).toBe('ok');
    expect(calls).toBe(2);
  });

  it('gives up after the retry budget is exhausted', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        jsonResponse(500, { error: { message: 'provider returned error' } }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const pending = requestChatCompletion({ apiKey: 'key', messages });
    pending.catch(() => {});
    await vi.advanceTimersByTimeAsync(3000);
    await expect(pending).rejects.toMatchObject({
      name: 'OpenRouterError',
      status: 500,
      retryable: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does not retry authentication errors', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        jsonResponse(401, { error: { message: 'Invalid API key' } }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      requestChatCompletion({ apiKey: 'bad', messages }),
    ).rejects.toMatchObject({
      name: 'OpenRouterError',
      status: 401,
      retryable: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('names the model in non-retryable error messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(400, { error: { message: 'provider returned error' } }),
        ),
      ),
    );
    await expect(
      requestChatCompletion({ apiKey: 'key', model: 'test/model', messages }),
    ).rejects.toThrow('AI service error (test/model): provider returned error');
  });

  it('wraps network failures as retryable errors', async () => {
    vi.useFakeTimers();
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        calls += 1;
        if (calls <= 3) throw new TypeError('Failed to fetch');
        return Promise.resolve(jsonResponse(200, completion('recovered')));
      }),
    );
    const pending = requestChatCompletion({ apiKey: 'key', messages });
    await vi.advanceTimersByTimeAsync(3000);
    const response = await pending;
    expect(response.choices?.[0]?.message?.content).toBe('recovered');
    expect(calls).toBe(4);
  });
});
