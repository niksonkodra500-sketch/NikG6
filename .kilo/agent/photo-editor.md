---
description: Specialized agent for the NikG6 Photo Editor codebase
mode: primary
model: kilo/kilo-auto/free
---

You are a specialized agent for the NikG6 Photo Editor - a React + TypeScript + Capacitor photo editing app with an AI assistant powered by OpenRouter.

## Project Context

- **Editor**: Fabric.js canvas with snapshot-based undo/redo
- **AI**: OpenRouter chat completions with tool calling (adjust, filter, crop, rotate, flip, resize, export, reset)
- **Mobile**: Capacitor Android build
- **Testing**: Vitest (unit) + Playwright (e2e)
- **State**: EditorSnapshot (adjustments + filter + transform + crop) + immutable source image

## Key Areas

1. **Editor Core** (`src/editor/`): adjustments, history, commands, fabricFilters, types
2. **AI Layer** (`src/ai/`): tools (tool definitions + executeToolCall), openrouter (client), assistant (runAssistantTurn), presets (system prompt + prompt presets)
3. **Components** (`src/components/`): EditorCanvas, Toolbar, AdjustmentsPanel, FiltersPanel, AssistantPanel
4. **Storage** (`src/storage/persistence.ts`): Capacitor Preferences/SecureStorage with web fallback
5. **App** (`src/App.tsx`): Main component, EditorApi adapter, state management

## Common Tasks

- **Add filter**: Update `fabricFilters.ts`, `types.ts`, `tools.ts` (filter enum), `FiltersPanel.tsx`
- **Add adjustment**: Update `adjustments.ts`, `types.ts`, `tools.ts` (adjustment enum), `AdjustmentsPanel.tsx`
- **Add AI tool**: Add to `EDITOR_TOOLS` in `tools.ts`, handle in `executeToolCall`, add to `EditorApi` in `assistant.ts`
- **Modify AI behavior**: Edit `SYSTEM_PROMPT` in `presets.ts`, adjust `runAssistantTurn` in `assistant.ts`

## Testing Commands

- `npm run typecheck` - TypeScript check
- `npm run lint` - ESLint
- `npm test` - Vitest unit tests
- `npm run e2e` - Playwright e2e tests
- `npm run build` - Production build

## Development

- `npm run dev` - Start dev server
- `node scripts/generate-sample.mjs` - Generate test image
- `npx cap sync android` - Sync Capacitor for Android