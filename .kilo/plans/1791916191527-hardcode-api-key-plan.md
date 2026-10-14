# Hardcode API Key and Default Model — Make Assistant Work Out of the Box

## Context

The user provided an OpenRouter API key (`YOUR_OPENROUTER_API_KEY`) and wants the AI assistant to work without users entering a key every time. They also want a reliable model pre-selected so the assistant is 100% functional.

## Current State

- `src/ai/openrouter.ts` — `DEFAULT_MODEL = 'google/gemini-2.0-flash-exp:free'`, no hardcoded key
- `src/storage/persistence.ts` — `getApiKey()` returns only stored key or `null`
- `src/App.tsx` — hydrates `apiKey` from storage; assistant blocked when `apiKey` is `null`
- `src/components/AssistantPanel.tsx` — shows API key input field and blocks sends when no key

## Plan

### 1. Add default API key constant (`src/ai/openrouter.ts`)

```ts
export const DEFAULT_API_KEY = 'YOUR_OPENROUTER_API_KEY';
```

### 2. Update `getApiKey()` to fall back to default (`src/storage/persistence.ts`)

Change `getApiKey()` so that when no key is stored, it returns `DEFAULT_API_KEY` instead of `null`. This means the assistant always has a working key without users needing to enter one.

```ts
export async function getApiKey(): Promise<string | null> {
  if (isNative) {
    try {
      const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
      const result = await SecureStoragePlugin.get({ key: API_KEY_STORAGE });
      return result.value ?? DEFAULT_API_KEY;
    } catch {
      return DEFAULT_API_KEY;
    }
  }
  return localStorage.getItem(API_KEY_STORAGE) ?? DEFAULT_API_KEY;
}
```

Import `DEFAULT_API_KEY` from `../ai/openrouter`.

### 3. Set a reliable default model (`src/ai/openrouter.ts`)

Change `DEFAULT_MODEL` to a paid, vision-capable model that is known to be reliable with tool calling:

```ts
export const DEFAULT_MODEL = 'google/gemini-2.0-flash-exp:free';
```

Keep as-is — the free Gemini 2.0 Flash model is reliable, supports vision, and works well with tool calling. The user's key has credits, so it can also use paid models if needed.

### 4. Update `App.tsx` hydration logic

The `apiKey` state should default to the stored key or the built-in default. Since `getApiKey()` now always returns a non-null key, the assistant will always be enabled. Remove the `if (key) setApiKey(key)` guard — just set it directly.

### 5. Update `AssistantPanel.tsx` UI

- Remove the "Enter your OpenRouter API key" error message (line 78-81)
- Remove the API key input field from the Settings block (lines 183-199)
- Remove the `disabled={pending || !props.apiKey}` from the Send button
- Keep the model selector and vision toggle

### 6. Update tests

- `src/ai/openrouter.test.ts` — no changes needed (tests mock fetch)
- `src/storage/persistence.test.ts` (if exists) — update to expect default key when nothing stored
- `src/ai/assistant.test.ts` — no changes needed

### 7. Verify

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run e2e`, `npm run build`.

## Files to Modify

1. `src/ai/openrouter.ts` — add `DEFAULT_API_KEY` constant
2. `src/storage/persistence.ts` — update `getApiKey()` to return default
3. `src/App.tsx` — simplify API key hydration
4. `src/components/AssistantPanel.tsx` — remove key input UI and blocking logic

## Risks

- **Key exposure**: The API key is hardcoded in source. It will be visible in the APK and web build. This is acceptable for the user's own app, but the key should be rotated if it's ever shared publicly.
- **Rate limits**: Free models may hit rate limits. The user's key has credits, so paid models are available as fallback.
- **Cost**: If the user switches to paid models, they'll be charged against their OpenRouter account.