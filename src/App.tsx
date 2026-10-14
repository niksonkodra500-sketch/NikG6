import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CameraResultType, type GalleryPhoto } from '@capacitor/camera';
import { AssistantPanel } from './components/AssistantPanel';
import { AdjustmentsPanel } from './components/AdjustmentsPanel';
import { EditorCanvas, type EditorHandle } from './components/EditorCanvas';
import { FiltersPanel } from './components/FiltersPanel';
import { Toolbar, type PanelTab } from './components/Toolbar';
import { DEFAULT_API_KEY, DEFAULT_MODEL, type ChatMessage } from './ai/openrouter';
import type { EditorApi, ToolCallResult } from './ai/tools';
import {
  DEFAULT_SNAPSHOT,
  type AdjustmentName,
  type EditorSnapshot,
  type ExportFormat,
  type FilterName,
} from './editor/types';
import {
  getApiKey,
  loadConversation,
  loadSettings,
  saveConversation,
  saveSettings,
} from './storage/persistence';
import { downloadDataUrl } from './utils/download';
import { SYSTEM_PROMPT } from './ai/presets';
import './App.css';

// Memory configuration
const MAX_RECENT_MESSAGES = 15; // Keep this many messages in full detail

// Simple conversation summarization
function createConversationSummary(messages: ChatMessage[]): string {
  if (messages.length === 0) return "No previous conversation.";
  
  // Count message types
  const userMessages = messages.filter(m => m.role === 'user').length;
  const assistantMessages = messages.filter(m => m.role === 'assistant').length;
  const toolMessages = messages.filter(m => m.role === 'tool').length;
  
  // Extract topics from user messages (simplistic)
  const userTexts = messages
    .filter(m => m.role === 'user' && typeof m.content === 'string')
    .map(m => m.content as string);
  
  // Look for common photo editing terms and categorize them
  const editTerms = {
    brightness: ['bright', 'contrast', 'exposure', 'shadows', 'highlights'],
    color: ['saturation', 'hue', 'temperature', 'warm', 'cool', 'vibrant', 'muted'],
    geometry: ['crop', 'rotate', 'flip', 'resize', 'scale'],
    filters: ['filter', 'blur', 'sharpen', 'grayscale', 'sepia', 'vintage'],
    details: ['noise', 'detail', 'texture', 'clarity', 'sharp']
  };
  
  const mentionedCategories = [];
  const mentionedTerms = [];
  
  for (const [category, terms] of Object.entries(editTerms)) {
    const foundTerms = terms.filter(term => 
      userTexts.some(text => text.toLowerCase().includes(term))
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
    summary += ` Recent discussion topics: ${userTexts.slice(-3).map(t => t.length > 50 ? t.substring(0, 50) + '...' : t).join('; ')}.`;
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
    content: `[MEMORY SUMMARY] ${summary}`
  };
  
  // Return summary + recent messages
  return [summaryMessage, ...recentMessages];
}

export default function App() {
  const editorRef = useRef<EditorHandle>(null);
  const [snapshot, setSnapshot] = useState<EditorSnapshot>(DEFAULT_SNAPSHOT);
  const [hasImage, setHasImage] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [originalMessages, setOriginalMessages] = useState<ChatMessage[]>([]); // Store original messages
  const [lastToolResults, setLastToolResults] = useState<ToolCallResult[]>([]);
  const [apiKey, setApiKey] = useState<string>(DEFAULT_API_KEY);
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [visionEnabled, setVisionEnabled] = useState(true);

  // Generate enhanced messages for AI (with summary) from original messages
  const enhancedMessages = useMemo(() => getConversationForAI(originalMessages), [originalMessages]);

  useEffect(() => {
    void getApiKey().then((key) => {
      setApiKey(key);
    });
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
    // Extract original messages from the AI's response by removing system messages
    // that we don't want to store: summary messages and the SYSTEM_PROMPT
    const originalNext = next.filter(msg => {
      // Don't store summary system messages
      if (msg.role === 'system' && typeof msg.content === 'string' && msg.content.startsWith('[MEMORY SUMMARY]')) {
        return false;
      }
      // Don't store the SYSTEM_PROMPT (it's regenerated each time)
      if (msg.role === 'system' && typeof msg.content === 'string' && msg.content === SYSTEM_PROMPT) {
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
            messages={enhancedMessages}
            lastToolResults={lastToolResults}
            apiKey={apiKey}
            model={model}
            visionEnabled={visionEnabled}
            editorApi={editorApi}
            getImageDataUrl={getImageDataUrl}
            onMessagesChange={handleMessagesChange}
            onToolResultsChange={handleToolResultsChange}
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