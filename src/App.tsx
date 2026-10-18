import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CameraResultType, type GalleryPhoto } from '@capacitor/camera';
import { AssistantPanel } from './components/AssistantPanel';
import { AdjustmentsPanel } from './components/AdjustmentsPanel';
import { BeforeAfter } from './components/BeforeAfter';
import { CropPanel } from './components/CropPanel';
import { EditorCanvas, type EditorHandle } from './components/EditorCanvas';
import { EditorMenu } from './components/EditorMenu';
import { ExportPresetPanel } from './components/ExportPresetPanel';
import { FiltersPanel } from './components/FiltersPanel';
import { OfflineBanner } from './components/OfflineBanner';
import { PresetPanel } from './components/PresetPanel';
import { ProjectsPanel } from './components/ProjectsPanel';
import { TextOverlayPanel } from './components/TextOverlayPanel';
import { type PanelTab } from './components/EditorMenu';
import { UpdateBanner, useAppUpdates } from './components/UpdateChecker';
import { DEFAULT_API_KEY, DEFAULT_MODEL, type ChatMessage } from './ai/openrouter';
import type { EditorApi, ToolCallResult } from './ai/tools';
import {
  DEFAULT_SNAPSHOT,
  DEFAULT_TEXT_OVERLAY,
  type AdjustmentName,
  type CropAspect,
  type EditorSnapshot,
  type ExportFormat,
  type FilterName,
  type TextOverlay,
} from './editor/types';
import {
  deleteApiKey,
  getApiKey,
  hasStoredApiKey,
  loadConversation,
  loadSettings,
  saveApiKey,
  saveConversation,
  saveSettings,
} from './storage/persistence';
import { downloadDataUrl, shareDataUrl } from './utils/download';
import { SYSTEM_PROMPT } from './ai/presets';
import './App.css';

// Memory configuration
const MAX_RECENT_MESSAGES = 15; // Keep this many messages in full detail

// Simple conversation summarization
  function createConversationSummary(messages: ChatMessage[]): string {
    if (messages.length === 0) return 'No previous conversation.';

    // Count message types
    const userMessages = messages.filter((m) => m.role === 'user').length;
    const assistantMessages = messages.filter((m) => m.role === 'assistant').length;
    const toolMessages = messages.filter((m) => m.role === 'tool').length;

    // Extract topics from user messages (simplistic)
    const userTexts = messages
      .filter((m) => m.role === 'user' && typeof m.content === 'string')
      .map((m) => m.content as string);

    // Look for common photo editing terms and categorize them
    const editTerms = {
      brightness: ['bright', 'contrast', 'exposure', 'shadows', 'highlights'],
      color: ['saturation', 'hue', 'temperature', 'warm', 'cool', 'vibrant', 'muted'],
      geometry: ['crop', 'rotate', 'flip', 'resize', 'scale'],
      filters: ['filter', 'blur', 'sharpen', 'grayscale', 'sepia', 'vintage'],
      details: ['noise', 'detail', 'texture', 'clarity', 'sharp'],
      text: ['text', 'caption', 'font', 'overlay'],
      presets: ['preset', 'portrait', 'cinematic', 'vintage film'],
    };

    const mentionedCategories = [];
    const mentionedTerms = [];

    for (const [category, terms] of Object.entries(editTerms)) {
      const foundTerms = terms.filter((term) =>
        userTexts.some((text) => text.toLowerCase().includes(term)),
      );
      if (foundTerms.length > 0) {
        mentionedCategories.push(category);
        mentionedTerms.push(...foundTerms);
      }
    }

    let summary = `Conversation summary: ${userMessages} user messages, ${assistantMessages} assistant responses, ${toolMessages} tool results.`;

    if (mentionedCategories.length > 0) {
      summary += ` User mentioned editing categories: ${mentionedCategories.join(', ')}.`;
    }

    if (mentionedTerms.length > 0) {
      // Limit to most frequently mentioned or recent terms
      const uniqueTerms = [...new Set(mentionedTerms)];
      summary += ` Specific terms: ${uniqueTerms.slice(0, 8).join(', ')}${uniqueTerms.length > 8 ? '...' : ''}.`;
    }

    if (userTexts.length > 0) {
      summary += ` Recent discussion topics: ${userTexts
        .slice(-3)
        .map((t) => (t.length > 50 ? t.substring(0, 50) + '...' : t))
        .join('; ')}.`;
    }

    // Summarize the actual edits made by the assistant (tool results carry the
    // ground truth of what changed, which is more useful than the assistant's
    // prose when pruning older context).
    const toolTexts = messages
      .filter((m) => m.role === 'tool' && typeof m.content === 'string')
      .map((m) => m.content as string);
    if (toolTexts.length > 0) {
      const recentTools = toolTexts.slice(-6);
      summary += ` Recent edits applied: ${recentTools.join('; ')}.`;
    }

    return summary;
  }

// Enhanced conversation processing for AI context
function getConversationForAI(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_RECENT_MESSAGES) {
    // Not enough messages to warrant summarization
    return messages;
  }

  // Split into recent (full detail) and older (to be summarized)
  const recentMessages = messages.slice(-MAX_RECENT_MESSAGES);
  const olderMessages = messages.slice(0, -MAX_RECENT_MESSAGES);

  // Create summary of older messages
  const summary = createConversationSummary(olderMessages);

  // Create a system message with the summary
  const summaryMessage: ChatMessage = {
    role: 'system',
    content: `[MEMORY SUMMARY] ${summary}`,
  };

  // Return summary + recent messages
  return [summaryMessage, ...recentMessages];
}

export default function App() {
  const editorRef = useRef<EditorHandle>(null);
  const [snapshot, setSnapshot] = useState<EditorSnapshot>(DEFAULT_SNAPSHOT);
  const [hasImage, setHasImage] = useState(false);
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [compareAfter, setCompareAfter] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [originalMessages, setOriginalMessages] = useState<ChatMessage[]>([]);
  const [lastToolResults, setLastToolResults] = useState<ToolCallResult[]>([]);
  const [apiKey, setApiKey] = useState<string>(DEFAULT_API_KEY);
  const [apiKeyIsDefault, setApiKeyIsDefault] = useState(true);
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [visionEnabled, setVisionEnabled] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [immersive, setImmersive] = useState(false);
  const [menuHidden, setMenuHidden] = useState(false);
  const updates = useAppUpdates();

  // Generate enhanced messages for AI (with summary) from original messages
  const enhancedMessages = useMemo(
    () => getConversationForAI(originalMessages),
    [originalMessages],
  );

  useEffect(() => {
    void (async () => {
      const stored = await hasStoredApiKey();
      if (stored) {
        const key = await getApiKey();
        setApiKey(key);
        setApiKeyIsDefault(false);
      } else {
        setApiKey(DEFAULT_API_KEY);
        setApiKeyIsDefault(true);
      }
    })();
    void loadConversation<ChatMessage>().then((stored) => {
      if (stored && stored.length) {
        setOriginalMessages(stored);
      }
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
      crop: (x, y, width, height, aspect) => editorRef.current?.crop(x, y, width, height, aspect),
      cropToAspect: (aspect: CropAspect) => editorRef.current?.cropToAspect(aspect),
      rotate: (degrees) => editorRef.current?.rotate(degrees),
      flip: (axis) => editorRef.current?.flip(axis),
      resize: (width, height) => editorRef.current?.resize(width, height),
      autoEnhance: () => {
        const handle = editorRef.current;
        if (!handle) return;
        handle.setAdjustment('brightness', 10);
        handle.setAdjustment('contrast', 15);
        handle.setAdjustment('saturation', 10);
        handle.setAdjustment('temperature', 10);
      },
      reset: () => editorRef.current?.reset(),
      exportImage: (format, quality) => {
        const handle = editorRef.current;
        if (!handle) return Promise.reject(new Error('No image loaded'));
        return handle.exportImage(format, quality);
      },
      getSnapshot: () => editorRef.current?.getSnapshot() ?? DEFAULT_SNAPSHOT,
      getImageInfo: () => editorRef.current?.getImageInfo() ?? null,
      applyPreset: (presetId: string) => editorRef.current?.applyPreset(presetId) ?? false,
      clearCrop: () => editorRef.current?.clearCrop(),
      addTextOverlay: (overlay: TextOverlay) =>
        editorRef.current?.addTextOverlay(overlay) ?? overlay.id,
      updateTextOverlay: (id: string, updates: Partial<TextOverlay>) =>
        editorRef.current?.updateTextOverlay(id, updates) ?? false,
      removeTextOverlay: (id: string) =>
        editorRef.current?.removeTextOverlay(id) ?? false,
    }),
    [],
  );

  const openFromDataUrl = useCallback(async (dataUrl: string) => {
    setSourceDataUrl(dataUrl);
    await editorRef.current?.loadFromDataUrl(dataUrl);
  }, []);

  const openFromFile = useCallback(
    async (file: File) => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read the file'));
        reader.readAsDataURL(file);
      });
      await openFromDataUrl(dataUrl);
    },
    [openFromDataUrl],
  );

  const openFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        window.alert('Please choose an image file');
        return;
      }
      void openFromFile(file);
    },
    [openFromFile],
  );

  const takePhoto = useCallback(async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.DataUrl,
      });
      if (photo.dataUrl) {
        await openFromDataUrl(photo.dataUrl);
      }
    } catch {
      // user cancelled
    }
  }, [openFromDataUrl]);

  const pickFromLibrary = useCallback(async () => {
    try {
      const result = await Camera.pickImages({ quality: 90 });
      const photo = result.photos[0] as GalleryPhoto | undefined;
      if (photo?.webPath) {
        await openFromDataUrl(photo.webPath);
      }
    } catch {
      // user cancelled
    }
  }, [openFromDataUrl]);

  const exportCurrent = useCallback(async () => {
    const handle = editorRef.current;
    if (!handle) return;
    try {
      const quality = exportFormat === 'png' ? 1 : 0.92;
      const dataUrl = await handle.exportImage(exportFormat, quality);
      downloadDataUrl(dataUrl, `edited-photo.${exportFormat === 'jpeg' ? 'jpg' : exportFormat}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Export failed');
    }
  }, [exportFormat]);

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

  const handleApiKeySave = useCallback(async (key: string) => {
    await saveApiKey(key);
    setApiKey(key);
    setApiKeyIsDefault(false);
  }, []);

  const handleApiKeyClear = useCallback(async () => {
    await deleteApiKey();
    setApiKey(DEFAULT_API_KEY);
    setApiKeyIsDefault(true);
  }, []);

  const handleShare = useCallback(async () => {
    const handle = editorRef.current;
    if (!handle) return;
    try {
      const dataUrl = await handle.exportImage('jpeg', 0.92);
      await shareDataUrl(dataUrl, 'edited-photo.jpg');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Share failed');
    }
  }, []);

  const handleAddOverlay = useCallback(() => {
    const newOverlay: TextOverlay = {
      ...DEFAULT_TEXT_OVERLAY,
      id: `text-${Date.now()}`,
    };
    setTextOverlays((prev) => [...prev, newOverlay]);
    return newOverlay;
  }, []);

  const handleUpdateOverlay = useCallback(
    (id: string, updates: Partial<TextOverlay>) => {
      setTextOverlays((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...updates } : o)),
      );
    },
    [],
  );

  const handleDeleteOverlay = useCallback((id: string) => {
    setTextOverlays((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const handleMessagesChange = useCallback((next: ChatMessage[]) => {
    // Extract original messages from the AI's response by removing system messages
    // that we don't want to store: summary messages and the SYSTEM_PROMPT
    const originalNext = next.filter((msg) => {
      // Don't store summary system messages
      if (
        msg.role === 'system' &&
        typeof msg.content === 'string' &&
        msg.content.startsWith('[MEMORY SUMMARY]')
      ) {
        return false;
      }
      // Don't store the SYSTEM_PROMPT (it's regenerated each time).
      // Compare after trimming to be robust against minor whitespace differences.
      if (
        msg.role === 'system' &&
        typeof msg.content === 'string' &&
        msg.content.trim() === SYSTEM_PROMPT.trim()
      ) {
        return false;
      }
      return true;
    });
    setOriginalMessages(originalNext);
    // Save original messages for persistence
    void saveConversation(originalNext);
  }, []);

  const handleToolResultsChange = useCallback((results: ToolCallResult[]) => {
    setLastToolResults(results);
  }, []);

  const handleNewChat = useCallback(() => {
    setOriginalMessages([]);
    void saveConversation([]);
  }, []);

  const handleRevert = useCallback((snap: EditorSnapshot) => {
    editorRef.current?.restoreSnapshot(snap);
  }, []);

  const handleProjectRestore = useCallback(
    async (dataUrl: string, snap: EditorSnapshot) => {
      await openFromDataUrl(dataUrl);
      editorRef.current?.restoreSnapshot(snap);
    },
    [openFromDataUrl],
  );

  const handleCompare = useCallback(async () => {
    setCompareMode((v) => !v);
    if (!compareMode && hasImage && sourceDataUrl) {
      try {
        const handle = editorRef.current;
        if (handle) {
          const after = await handle.getImageDataUrl();
          setCompareAfter(after);
        }
      } catch {
        // ignore compare failures
      }
    }
  }, [compareMode, hasImage, sourceDataUrl]);

  // Online/offline detection so the assistant can show an offline notice.
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const getImageDataUrl = useCallback((maxSize?: number) => {
    const handle = editorRef.current;
    if (!handle) return Promise.resolve(null);
    return handle.getImageDataUrl(maxSize);
  }, []);

  return (
    <div className={`app fullscreen${assistantOpen ? ' assistant-open' : ''}${menuHidden ? ' menu-hidden' : ''}`}>
      <OfflineBanner online={online} />
      <UpdateBanner updates={updates} />
        <header className="app-header float">
          <h1 className="animated">NikG6 Photo Editor</h1>
          <p className="app-tagline">Professional photo editing powered by AI</p>
      </header>
      <main className="workspace">
        <div className="canvas-container">
          <EditorMenu
            canUndo={canUndo}
            canRedo={canRedo}
            hasImage={hasImage}
            activeTab={activeTab}
            exportFormat={exportFormat}
            assistantOpen={assistantOpen}
            immersive={immersive}
            menuHidden={menuHidden}
            onImmersiveToggle={() => setImmersive((v) => !v)}
            onToggleMenu={() => setMenuHidden((v) => !v)}
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
            onShare={() => {
              void handleShare();
            }}
            onCompare={() => void handleCompare()}
            onOpenProjects={() => void setActiveTab((t) => (t === 'projects' ? null : 'projects'))}
            onExportFormatChange={(f) => setExportFormat(f)}
            onToggleAssistant={() => setAssistantOpen((o) => !o)}
            onTabChange={setActiveTab}
          />
          <div className="canvas-stage" style={{ pointerEvents: hasImage ? 'auto' : 'none' }}>
            {compareMode && hasImage && sourceDataUrl && compareAfter ? (
              <BeforeAfter
                before={sourceDataUrl}
                after={compareAfter}
                filename="edited-photo.png"
              />
            ) : (
              <EditorCanvas
                ref={editorRef}
                onStateChange={handleStateChange}
                onHistoryChange={handleHistoryChange}
                onTextOverlaysChange={setTextOverlays}
                immersive={immersive}
              />
            )}
            {textOverlays.map((overlay) => (
              <div
                key={overlay.id}
                className="text-overlay-render"
                style={{
                  position: 'absolute',
                  left: `${overlay.x}%`,
                  top: `${overlay.y}%`,
                  transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg)`,
                  fontSize: `${overlay.fontSize}px`,
                  color: overlay.color,
                  fontFamily: overlay.fontFamily,
                  fontWeight: overlay.bold ? 'bold' : 'normal',
                  fontStyle: overlay.italic ? 'italic' : 'normal',
                  opacity: overlay.opacity,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  zIndex: 10,
                }}
              >
                {overlay.text}
              </div>
            ))}
          </div>
        </div>
        {activeTab === 'adjust' && (
          <AdjustmentsPanel
            adjustments={snapshot.adjustments}
            onChange={(name, value) =>
              editorRef.current?.setAdjustment(name, value, { commit: false })
            }
            onCommit={() => editorRef.current?.commit()}
            onAutoEnhance={() => editorRef.current?.autoEnhance()}
            onClose={() => setActiveTab(null)}
          />
        )}
        {activeTab === 'filters' && (
          <FiltersPanel
            current={snapshot.filter}
            onSelect={(filter) => editorRef.current?.applyFilter(filter)}
            onClose={() => setActiveTab(null)}
          />
        )}
        {activeTab === 'crop' && (
          <CropPanel
            crop={snapshot.crop}
            naturalWidth={editorRef.current?.getNaturalSize().width ?? 0}
            naturalHeight={editorRef.current?.getNaturalSize().height ?? 0}
            onCrop={(x, y, w, h, aspect) => editorRef.current?.crop(x, y, w, h, aspect)}
            onCropToAspect={(aspect) => editorRef.current?.cropToAspect(aspect)}
            onClearCrop={() => editorRef.current?.cropToAspect('free')}
            onClose={() => setActiveTab(null)}
          />
        )}
        {activeTab === 'projects' && (
          <ProjectsPanel
            sourceDataUrl={sourceDataUrl}
            snapshot={snapshot}
            onRestore={(dataUrl, snap) => void handleProjectRestore(dataUrl, snap)}
            onClose={() => setActiveTab(null)}
          />
        )}
        {activeTab === 'presets' && (
          <PresetPanel
            adjustments={snapshot.adjustments}
            onApplyPreset={(adjustments, filter) => {
              editorRef.current?.setAdjustment('brightness', adjustments.brightness);
              editorRef.current?.setAdjustment('contrast', adjustments.contrast);
              editorRef.current?.setAdjustment('saturation', adjustments.saturation);
              editorRef.current?.setAdjustment('hue', adjustments.hue);
              editorRef.current?.setAdjustment('temperature', adjustments.temperature);
              if (filter) {
                editorRef.current?.applyFilter(filter as FilterName);
              }
              editorRef.current?.commit();
            }}
            onClose={() => setActiveTab(null)}
          />
        )}
        {activeTab === 'text' && (
          <TextOverlayPanel
            overlays={textOverlays}
            onAdd={handleAddOverlay}
            onUpdate={handleUpdateOverlay}
            onDelete={handleDeleteOverlay}
            onClose={() => setActiveTab(null)}
          />
        )}
        {activeTab === 'export_presets' && (
          <ExportPresetPanel
            exportFormat={exportFormat}
            onExportFormatChange={(f) => setExportFormat(f)}
            onClose={() => setActiveTab(null)}
          />
        )}
      </main>
      {assistantOpen && (
        <AssistantPanel
          messages={enhancedMessages}
          lastToolResults={lastToolResults}
          apiKey={apiKey}
          apiKeyIsDefault={apiKeyIsDefault}
          model={model}
          visionEnabled={visionEnabled}
          editorApi={editorApi}
          getImageDataUrl={getImageDataUrl}
          onMessagesChange={handleMessagesChange}
          onToolResultsChange={handleToolResultsChange}
          onModelChange={handleModelChange}
          onVisionChange={handleVisionChange}
          onSaveApiKey={handleApiKeySave}
          onClearApiKey={handleApiKeyClear}
          onNewChat={handleNewChat}
          onRevert={handleRevert}
          onClose={() => setAssistantOpen(false)}
        />
      )}
    </div>
  );
}
