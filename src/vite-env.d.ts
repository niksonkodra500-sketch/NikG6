/// <reference types="vite/client" />

import type { EditorHandle } from './components/EditorCanvas';

declare global {
  interface Window {
    __editorHandle?: EditorHandle;
  }
}
