# Photo Editing App with Built-in AI Assistant — Implementation Plan

## Context

- Environment: headless Debian 13 container, Node.js v24.9.0 + npm 11.6.0 verified working, internet reachable, `apt` available. No GUI/browser/GPU, no Android/iOS toolchains.
- Repo `/workspace/app`: git repo (branch `kilo/live-copper-nwe`), remote `github.com/niksonkodra500-sketch/NikG6`, MIT LICENSE only at start.

## Resolved decisions

- Platform: mobile app, Android-first; React + Vite + TypeScript web codebase wrapped in Capacitor; native builds (APK/AAB) in GitHub Actions.
- Editor: Fabric.js canvas; snapshot-based undo/redo (History<EditorSnapshot>); single-photo sessions.
- AI: cloud-first, general-purpose online assistant via OpenRouter — chat + photo-edit tool-calling + vision (photo attached to a vision-capable model). "Kilo Code inside the app" = LLM-backed assistant panel (the Kilo agent itself is not embeddable — out of scope).
- API key: user supplies own OpenRouter key, entered on first run, stored in Capacitor SecureStorage (native) / localStorage (web). Never hardcoded.
- Post-v1 (out of scope): on-device models, web search, iOS, background removal, region-aware masking, multi-photo library.

## Cross-checks on user claims

- "See everything from worldwide databases": not literally achievable — no API provides universal database access. Assistant knowledge = LLM training knowledge + the photo (vision). Stated in-app via the assistant's system prompt.
- Vision implication: photos are uploaded to the cloud LLM. The assistant panel shows a privacy notice with a vision opt-out toggle.

## Architecture & data flow

- AI edit loop: user prompt (+ photo as downscaled JPEG data URL for vision) → OpenRouter chat model with JSON tool definitions (`adjust`, `apply_filter`, `crop`, `rotate`, `flip`, `resize`, `export_image`, `reset`) → tool call → `executeToolCall` maps to an EditorApi method on the canvas → result fed back to the model → final reply shown in chat (max 5 tool rounds).
- State: every edit reconstructible from `EditorSnapshot` (adjustments + filter + transform + crop) + the immutable source image. History stores snapshots, not canvas JSON.
- Persistence: conversation + settings via Capacitor Preferences (web fallback localStorage); API key via SecureStorage (native); project JSON via Capacitor Filesystem (web fallback localStorage).
- First run: onboarding prompts for the OpenRouter API key; assistant unavailable until set; editor fully functional without it.

## Implementation status (already written to disk)

Done:
- Config scaffold: `package.json`, `tsconfig.json` + `tsconfig.app.json` + `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `capacitor.config.ts`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `index.html`.
- Editor core: `src/editor/types.ts`, `adjustments.ts`, `history.ts`, `commands.ts`, `fabricFilters.ts` (incl. custom `TemperatureFilter`).
- AI layer: `src/ai/tools.ts` (tool definitions + `executeToolCall`), `openrouter.ts` (client, `OpenRouterError`, model options), `assistant.ts` (`runAssistantTurn` loop), `presets.ts` (prompt presets + system prompt).
- Storage: `src/storage/persistence.ts` (key/conversation/settings/projects with native+web paths).
- Utils: `src/utils/download.ts` (browser download / native Filesystem+Share).
- `src/vite-env.d.ts`.

In progress / unverified: `npm install` was started in the background (job `bgp_1359f1cf4001tT37HBK7ThW30c`) — completion not confirmed; verify `node_modules/` exists, rerun `npm install --no-audit --no-fund` if missing.

## Remaining task list (in order)

1. **`src/components/EditorCanvas.tsx`** — forwardRef component owning the `fabric.Canvas` lifecycle. Imperative `EditorHandle`: `loadFromFile`, `loadFromDataUrl` (validate via HTMLImageElement probe, then `fabric.Image.fromURL`), `getSnapshot`, `restoreSnapshot`, `commit` (dedupe via JSON compare, push to `History`), `undo`/`redo`, `setAdjustment(name, value, {commit})` (live slider updates commit=false; release commits), `applyFilter`, `crop` (clamp to natural bounds), `rotate` (normalize to (-180,180], multiples of 90; swap canvas w/h), `flip`, `resize` (scaleX/scaleY relative to current source dims), `reset`, `exportImage(format, quality)` via `canvas.toDataURL`, `getImageDataUrl(maxSize)` (downscaled JPEG for vision), `hasImage`, `getCanvasPixel()` (reads `canvas.upperCanvasEl` center pixel — for e2e). `applySnapshot(snapshot)` rebuilds: `image.filters = buildFabricFilters(...)`, `applyFilters()`, angle/flipX/flipY/scaleX/scaleY, cropX/cropY/width/height, canvas dims. Report state up via `onStateChange(snapshot, hasImage)` and `onHistoryChange(canUndo, canRedo)` callbacks (store in refs to keep handle identity stable). Expose `window.__editorHandle` for e2e.
2. **`src/components/Toolbar.tsx`** — buttons: Open (hidden `<input type=file>`), Camera (`@capacitor/camera`, DataUrl result), Library (`@capacitor/photos`), Undo, Redo, Rotate 90°, Flip H, Flip V, Reset, Export (format select PNG/JPEG/WebP), and tab toggles (Adjust / Filters / Assistant).
3. **`src/components/AdjustmentsPanel.tsx`** — range sliders (-100..100) for brightness/contrast/saturation/hue/temperature with value badges; `onChange` → live update, pointer-up/blur → commit; Reset button when non-neutral.
4. **`src/components/FiltersPanel.tsx`** — grid of `FILTER_LABELS` buttons; highlight active filter.
5. **`src/components/AssistantPanel.tsx`** — chat UI rendering `ChatMessage`s, last-turn tool-result chips, input + send (AbortController), error display, prompt preset chips, settings block: API key entry (password input → `saveApiKey`), model select (`MODEL_OPTIONS`), vision toggle with privacy notice. On send: prepend `SYSTEM_PROMPT` if first message, attach image via `getImageDataUrl(1024)` when vision on, run `runAssistantTurn`, persist conversation via `saveConversation`.
6. **`src/App.tsx`** — owns snapshot/hasImage/canUndo/canRedo state, active panel tab, assistant state; hydrates key/conversation/settings on mount; `EditorApi` adapter wrapping `editorRef` (discrete ops commit automatically); file open via FileReader → `loadFromDataUrl`; export via `downloadDataUrl`; responsive layout (header / toolbar / canvas / panel).
7. **`src/main.tsx`** (no StrictMode — fabric lifecycle safety) and **`src/App.css`** (dark theme, flex layout, mobile bottom tabs at ≤768px).
8. **Unit tests** (`vitest`, pure modules): `src/editor/adjustments.test.ts` (clampSlider, sliderToFilterValue hue→degrees, mergeAdjustment, isNeutralAdjustments), `src/editor/history.test.ts` (push/undo/redo/limit/clear/redo-invalidation), `src/editor/commands.test.ts` (clamps, parseRotationArg, type guards), `src/ai/tools.test.ts` (`executeToolCall` with a mock `EditorApi` recording calls: adjust clamps to 100, unknown adjustment fails, filter/crop/rotate/flip/resize sequence, export, unknown tool).
9. **`scripts/generate-sample.mjs`** — dependency-free 32×32 RGB gradient PNG (row=green, col=r up / b down; center pixel r=120,g=120,b=128) using `node:zlib` deflate + hand-rolled CRC32; writes `public/sample.png`. Run: `node scripts/generate-sample.mjs`.
10. **`e2e/editor.spec.ts`** (Playwright, webServer `npm run dev`): open sample via filechooser event on the Open button; assert `window.__editorHandle.hasImage()`; pixel check — center pixel has r≠b before, r==g==b after clicking Grayscale; export returns `data:image/png;base64,` prefix; Undo restores color (r≠g).
11. **CI**: `.github/workflows/ci.yml` (checkout, setup-node 22 + npm cache, `npm ci`, lint, typecheck, `npm test`, `microsoft/playwright-github-action@v1`, `npx playwright install --with-deps chromium`, `npm run e2e`, `npm run build`) and `.github/workflows/android.yml` (on tag `v*` + workflow_dispatch: npm ci, build, `android-actions/setup-android@v3`, `npx cap sync android`, `cd android && ./gradlew assembleDebug --no-daemon`, upload `android/app/build/outputs/apk/debug/app-debug.apk` artifact).
12. **Verify**: `npm run typecheck`, `npm run lint`, `npm test`, `npm run e2e`, `npm run build`. Fix failures (likely spots: fabric v6 `BaseFilter` subclass typing for `TemperatureFilter`; `fabric.Image.filters.*` option types).
13. **`npx cap add android`** (no SDK needed — platform wrapper only; commit the `android/` folder, keep `.gitignore` exclusions for local state).
14. **Commit** locally on `kilo/live-copper-nwe` (git add + commit; do NOT push — pushing needs explicit user approval).

## Failure modes

- No network: assistant unavailable with offline notice; editor fully functional.
- Missing/invalid API key: assistant prompts to enter key in settings (401/403 → `OpenRouterError('Invalid API key…')`).
- Vision off or model lacks vision: text-command mode only.
- LLM tool-call parse failure: safe no-op, result fed back as failure text; user edits manually.
- Large images: vision upload capped at 1024px / JPEG q0.8; export stays full-res.

## Risks

- No GUI in container: verify UI via Playwright; access the dev server through the host port tunnel.
- Cloud dependency: assistant quality/cost tied to OpenRouter; tool definitions kept minimal to reduce tokens.
- Android WebView: Capacitor 6 uses the system WebView; camera/library plugins fall back to file pickers on web.

## Validation

- Vitest unit: adjustment math, history stack, tool-call parsing/execution.
- Playwright e2e: open → grayscale (pixel assert) → undo (pixel assert) → export (data URL assert).
- Manual (post-handoff): install debug APK on an Android device; test assistant edit round-trip (text + vision).

## Open questions

None blocking. Defaults set: per-user OpenRouter key, vision opt-in, single-photo sessions, background removal post-v1.
