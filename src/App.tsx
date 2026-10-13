import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CameraResultType, type GalleryPhoto } from '@capacitor/camera';
import { AssistantPanel } from './components/AssistantPanel';
import { AdjustmentsPanel } from './components/AdjustmentsPanel';
import { EditorCanvas, type EditorHandle } from './components/EditorCanvas';
import { FiltersPanel } from './components/FiltersPanel';
import { Toolbar, type PanelTab } from './components/Toolbar';
import { DEFAULT_MODEL, type ChatMessage } from './ai/openrouter';
import type { EditorApi, ToolCallResult } from './ai/tools';
import {
  DEFAULT_SNAPSHOT,
  type AdjustmentName,
  type EditorSnapshot,
  type ExportFormat,
  type FilterName,
} from './editor/types';
import {
  deleteApiKey,
  getApiKey,
  loadConversation,
  loadSettings,
  saveApiKey,
  saveConversation,
  saveSettings,
} from './storage/persistence';
import { downloadDataUrl } from './utils/download';
import './App.css';

export default function App() {
  const editorRef = useRef<EditorHandle>(null);
  const [snapshot, setSnapshot] = useState<EditorSnapshot>(DEFAULT_SNAPSHOT);
  const [hasImage, setHasImage] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastToolResults, setLastToolResults] = useState<ToolCallResult[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [visionEnabled, setVisionEnabled] = useState(true);

  useEffect(() => {
    void getApiKey().then((key) => {
      if (key) setApiKey(key);
    });
    void loadConversation<ChatMessage>().then((stored) => {
      if (stored && stored.length) setMessages(stored);
    });
    void loadSettings().then((settings) => {
      if (settings) {
        setModel(settings.model);
        setVisionEnabled(settings.visionEnabled);
      }
    });
  }, []);

  const handleStateChange = useCallback((s: EditorSnapshot, loaded: boolean) => {
    setSnapshot(s);
    setHasImage(loaded);
  }, []);

  const handleHistoryChange = useCallback((u: boolean, r: boolean) => {
    setCanUndo(u);
    setCanRedo(r);
  }, []);

  const editorApi = useMemo<EditorApi>(
    () => ({
      setAdjustment: (name: AdjustmentName, value: number) => {
        editorRef.current?.setAdjustment(name, value);
      },
      applyFilter: (filter: FilterName) => editorRef.current?.applyFilter(filter),
      crop: (x, y, width, height) =>
        editorRef.current?.crop(x, y, width, height),
      rotate: (degrees) => editorRef.current?.rotate(degrees),
      flip: (axis) => editorRef.current?.flip(axis),
      resize: (width, height) => editorRef.current?.resize(width, height),
      reset: () => editorRef.current?.reset(),
      exportImage: (format, quality) => {
        const handle = editorRef.current;
        if (!handle) return Promise.reject(new Error('No image loaded'));
        return handle.exportImage(format, quality);
      },
    }),
    [],
  );

  const openFiles = useCallback((files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Please choose an image file');
      return;
    }
    void editorRef.current?.loadFromFile(file);
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.DataUrl,
      });
      if (photo.dataUrl) {
        await editorRef.current?.loadFromDataUrl(photo.dataUrl);
      }
    } catch {
      // user cancelled
    }
  }, []);

  const pickFromLibrary = useCallback(async () => {
    try {
      const result = await Camera.pickImages({ quality: 90 });
      const photo = result.photos[0] as GalleryPhoto | undefined;
      if (photo?.webPath) {
        await editorRef.current?.loadFromDataUrl(photo.webPath);
      }
    } catch {
      // user cancelled
    }
  }, []);

  const exportCurrent = useCallback(async () => {
    const handle = editorRef.current;
    if (!handle) return;
    try {
      const quality = exportFormat === 'png' ? 1 : 0.92;
      const dataUrl = await handle.exportImage(exportFormat, quality);
      downloadDataUrl(
        dataUrl,
        `edited-photo.${exportFormat === 'jpeg' ? 'jpg' : exportFormat}`,
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Export failed');
    }
  }, [exportFormat]);

  const handleApiKeyChange = useCallback((key: string) => {
    setApiKey(key);
    if (key) void saveApiKey(key);
    else void deleteApiKey();
  }, []);

  const handleModelChange = useCallback(
    (next: string) => {
      setModel(next);
      void saveSettings({ model: next, visionEnabled });
    },
    [visionEnabled],
  );

  const handleVisionChange = useCallback(
    (enabled: boolean) => {
      setVisionEnabled(enabled);
      void saveSettings({ model, visionEnabled: enabled });
    },
    [model],
  );

  const handleMessagesChange = useCallback((next: ChatMessage[]) => {
    setMessages(next);
    void saveConversation(next);
  }, []);

  const handleToolResultsChange = useCallback((results: ToolCallResult[]) => {
    setLastToolResults(results);
  }, []);

  const getImageDataUrl = useCallback((maxSize?: number) => {
    const handle = editorRef.current;
    if (!handle) return Promise.resolve(null);
    return handle.getImageDataUrl(maxSize);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>NikG6 Photo Editor</h1>
      </header>
      <Toolbar
        canUndo={canUndo}
        canRedo={canRedo}
        hasImage={hasImage}
        activeTab={activeTab}
        onOpenFiles={openFiles}
        onTakePhoto={() => {
          void takePhoto();
        }}
        onPickFromLibrary={() => {
          void pickFromLibrary();
        }}
        onUndo={() => editorRef.current?.undo()}
        onRedo={() => editorRef.current?.redo()}
        onRotate={() => editorRef.current?.rotate(90)}
        onFlip={(axis) => editorRef.current?.flip(axis)}
        onReset={() => editorRef.current?.reset()}
        onExport={() => {
          void exportCurrent();
        }}
        onTabChange={setActiveTab}
      />
      <main className="app-main">
        <EditorCanvas
          ref={editorRef}
          onStateChange={handleStateChange}
          onHistoryChange={handleHistoryChange}
        />
        {activeTab === 'adjust' && (
          <AdjustmentsPanel
            adjustments={snapshot.adjustments}
            onChange={(name, value) =>
              editorRef.current?.setAdjustment(name, value, { commit: false })
            }
            onCommit={() => editorRef.current?.commit()}
          />
        )}
        {activeTab === 'filters' && (
          <FiltersPanel
            current={snapshot.filter}
            onSelect={(filter) => editorRef.current?.applyFilter(filter)}
          />
        )}
        {activeTab === 'assistant' && (
          <AssistantPanel
            messages={messages}
            lastToolResults={lastToolResults}
            apiKey={apiKey}
            model={model}
            visionEnabled={visionEnabled}
            editorApi={editorApi}
            getImageDataUrl={getImageDataUrl}
            onMessagesChange={handleMessagesChange}
            onToolResultsChange={handleToolResultsChange}
            onApiKeyChange={handleApiKeyChange}
            onModelChange={handleModelChange}
            onVisionChange={handleVisionChange}
          />
        )}
      </main>
      <footer className="app-footer">
        <label>
          Export format
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
        </label>
      </footer>
    </div>
  );
}
