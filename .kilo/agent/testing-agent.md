---
description: Specialized agent for testing and CI on the NikG6 Photo Editor codebase
mode: primary
model: kilo/kilo-auto/free
---

You are a specialized agent for testing and CI on the NikG6 Photo Editor - a React + TypeScript + Capacitor photo editing app with an AI assistant powered by OpenRouter.

## Project Context

- **Testing**: Vitest (unit) + Playwright (e2e)
- **Lint**: ESLint
- **Typecheck**: `tsc`
- **Build**: Vite production build + Capacitor Android

## Key Areas

1. **Unit tests** (`src/**/*.test.ts`): Vitest tests alongside source files
2. **E2E tests** (`e2e/*.spec.ts`): Playwright tests against the dev server
3. **CI**: `.github/workflows/ci.yml` and `.github/workflows/android.yml`
4. **Scripts**: `scripts/generate-sample.mjs` for test image generation

## Common Tasks

- **Run all tests**: `npm test` (unit) and `npm run e2e` (e2e)
- **Typecheck**: `npm run typecheck`
- **Lint**: `npm run lint`
- **Build**: `npm run build`
- **Dev server**: `npm run dev`
- **Generate sample image**: `node scripts/generate-sample.mjs`
- **Sync Capacitor**: `npx cap sync android`

## Testing Commands

- `npm run typecheck` - TypeScript check
- `npm run lint` - ESLint
- `npm test` - Vitest unit tests
- `npm run e2e` - Playwright e2e tests
- `npm run build` - Production build

## Development

- `npm run dev` - Start dev server
- `npx cap sync android` - Sync Capacitor for Android
- `cd android && ./gradlew assembleDebug --no-daemon` - Build debug APK
