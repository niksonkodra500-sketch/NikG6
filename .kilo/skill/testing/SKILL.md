---
name: testing
description: Skills for testing and CI on the NikG6 Photo Editor codebase
---

# NikG6 Photo Editor - Testing & CI Skills

This skill provides context for running tests, lint, typecheck, and CI on the photo editor codebase.

## Testing Stack

- **Unit tests**: Vitest, test files colocated as `*.test.ts` next to source
- **E2E tests**: Playwright, `e2e/*.spec.ts` against `npm run dev`
- **Lint**: ESLint (`eslint.config.js`)
- **Typecheck**: TypeScript (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`)
- **Build**: Vite (`vite.config.ts`) for production web build

## Common Tasks

- Run unit tests: `npm test`
- Run e2e tests: `npm run e2e` (starts dev server automatically)
- TypeScript check: `npm run typecheck`
- ESLint: `npm run lint`
- Production build: `npm run build`
- Generate sample test image: `node scripts/generate-sample.mjs`
- Sync Capacitor Android: `npx cap sync android`

## CI Workflows

- `.github/workflows/ci.yml` — checkout, setup-node, npm ci, lint, typecheck, tests, e2e, build
- `.github/workflows/android.yml` — tag-based + workflow_dispatch, builds debug APK
