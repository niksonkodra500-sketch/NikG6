import { useEffect, useRef } from 'react';
import type { ExportFormat } from '../editor/types';

/** Tab identifiers for the floating editor panels. */
export type PanelTab =
  | 'adjust'
  | 'filters'
  | 'crop'
  | 'projects'
  | 'presets'
  | 'text'
  | 'export_presets';

interface EditorMenuProps {
  canUndo: boolean;
  canRedo: boolean;
  hasImage: boolean;
  activeTab: PanelTab | null;
  exportFormat: ExportFormat;
  assistantOpen: boolean;
  immersive: boolean;
  menuHidden: boolean;
  isOpen: boolean;
  onImmersiveToggle: () => void;
  onToggleMenu: () => void;
  onOpenFiles: (files: FileList | null) => void;
  onTakePhoto: () => void;
  onPickFromLibrary: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRotate: () => void;
  onFlip: (axis: 'x' | 'y') => void;
  onReset: () => void;
  onExport: () => void;
  onShare: () => void;
  onCompare: () => void;
  onOpenProjects: () => void;
  onTabChange: (tab: PanelTab | null) => void;
  onExportFormatChange: (format: ExportFormat) => void;
  onToggleAssistant: () => void;
}

export function EditorMenu(props: EditorMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { canUndo, canRedo, hasImage, activeTab, exportFormat, assistantOpen, immersive, menuHidden } = props;
  const closeMenu = () => {
    if (menuRef.current) {
      menuRef.current.classList.remove('open');
    }
  };

  // Click outside to close the panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;
      const menuEl = menuRef.current;
      const panelEl = panelRef.current;
      if (menuEl && !menuEl.contains(event.target as Node)) {
        if (panelEl && !panelEl.contains(event.target as Node)) {
          props.onToggleMenu();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, props.onToggleMenu]);

  return (
    <div className="editor-menu" ref={menuRef}>
      <button
        type="button"
        className={`editor-menu-trigger${isOpen ? ' trigger-open' : ''}`}
        aria-label={isOpen ? 'Hide menu' : 'Show menu'}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => {
          props.onToggleMenu();
          if (menuRef.current) {
            if (menuRef.current.classList.contains('open')) {
              menuRef.current.classList.remove('open');
            } else {
              menuRef.current.classList.add('open');
            }
          }
        }}
      >
        {isOpen ? '✕' : '☰'}
      </button>
      <div
        className={`editor-menu-panel${isOpen ? ' open' : ''}`}
        ref={panelRef}
        data-isopen={String(isOpen)}
      >
        <div className="editor-menu-dropdown" role="menu">
        <div className="toolbar-group" role="toolbar">
          <button
            type="button"
            className="icon-open"
            aria-label="Open"
            onClick={() => {
              fileInputRef.current?.click();
              closeMenu();
            }}
          >
            Open
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              props.onOpenFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            className="icon-camera"
            aria-label="Take photo"
            onClick={() => {
              props.onTakePhoto();
              closeMenu();
            }}
          >
            Camera
          </button>
          <button
            type="button"
            className="icon-library"
            aria-label="Pick from library"
            onClick={() => {
              props.onPickFromLibrary();
              closeMenu();
            }}
          >
            Library
          </button>
        </div>
        <div className="toolbar-group">
          <button
            type="button"
            className="icon-undo"
            aria-label="Undo"
            disabled={!canUndo || !hasImage}
            onClick={() => {
              props.onUndo();
              closeMenu();
            }}
          >
            Undo
          </button>
          <button
            type="button"
            className="icon-redo"
            aria-label="Redo"
            disabled={!canRedo || !hasImage}
            onClick={() => {
              props.onRedo();
              closeMenu();
            }}
          >
            Redo
          </button>
          <button
            type="button"
            className="icon-rotate"
            aria-label="Rotate 90°"
            disabled={!hasImage}
            onClick={() => {
              props.onRotate();
              closeMenu();
            }}
          >
            Rotate
          </button>
          <button
            type="button"
            className="icon-fliph"
            aria-label="Flip horizontal"
            disabled={!hasImage}
            onClick={() => {
              props.onFlip('x');
              closeMenu();
            }}
          >
            Flip H
          </button>
          <button
            type="button"
            className="icon-flipv"
            aria-label="Flip vertical"
            disabled={!hasImage}
            onClick={() => {
              props.onFlip('y');
              closeMenu();
            }}
          >
            Flip V
          </button>
          <button
            type="button"
            className="icon-reset"
            aria-label="Reset"
            disabled={!hasImage}
            onClick={() => {
              props.onReset();
              closeMenu();
            }}
          >
            Reset
          </button>
        </div>
        <div className="toolbar-group">
          <button
            type="button"
            className="icon-compare"
            aria-label="Compare before/after"
            disabled={!hasImage}
            onClick={() => {
              props.onCompare();
              closeMenu();
            }}
          >
            Compare
          </button>
          <button
            type="button"
            className={`icon-export ${activeTab === 'adjust' ? 'active' : ''}`}
            aria-label="Adjustments"
            disabled={!hasImage}
            onClick={() => {
              props.onTabChange(activeTab === 'adjust' ? null : 'adjust');
              closeMenu();
            }}
          >
            Adjust
          </button>
          <button
            type="button"
            className="icon-filters"
            aria-label="Filters"
            disabled={!hasImage}
            onClick={() => {
              props.onTabChange(activeTab === 'filters' ? null : 'filters');
              closeMenu();
            }}
          >
            Filters
          </button>
          <button
            type="button"
            className="icon-crop"
            aria-label="Crop"
            disabled={!hasImage}
            onClick={() => {
              props.onTabChange(activeTab === 'crop' ? null : 'crop');
              closeMenu();
            }}
          >
            Crop
          </button>
          <button
            type="button"
            className="icon-projects"
            aria-label="Projects"
            disabled={!hasImage}
            onClick={() => {
              props.onOpenProjects();
              closeMenu();
            }}
          >
            Projects
          </button>
          <button
            type="button"
            className="icon-presets"
            aria-label="Presets"
            disabled={!hasImage}
            onClick={() => {
              props.onTabChange(activeTab === 'presets' ? null : 'presets');
              closeMenu();
            }}
          >
            Presets
          </button>
          <button
            type="button"
            className="icon-text"
            aria-label="Text Overlay"
            disabled={!hasImage}
            onClick={() => {
              props.onTabChange(activeTab === 'text' ? null : 'text');
              closeMenu();
            }}
          >
            Text
          </button>
          <button
            type="button"
            className="icon-export-preset"
            aria-label="Export Presets"
            disabled={!hasImage}
            onClick={() => {
              props.onTabChange(activeTab === 'export_presets' ? null : 'export_presets');
              closeMenu();
            }}
          >
            Export Presets
          </button>
        </div>
<div className="toolbar-group">
            <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Format</span>
              <select
                value={exportFormat}
                onChange={(e) => props.onExportFormatChange(e.target.value as ExportFormat)}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WebP</option>
              </select>
            </label>
            <button
              type="button"
              className="icon-export"
              aria-label="Export"
              disabled={!hasImage}
              onClick={() => {
                props.onExport();
                closeMenu();
              }}
            >
              Export
            </button>
            <button
              type="button"
              className="icon-share"
              aria-label="Share"
              disabled={!hasImage}
              onClick={() => {
                props.onShare();
                closeMenu();
              }}
            >
              Share
            </button>
            <button
              type="button"
              className={`icon-assistant ${assistantOpen ? 'active' : ''}`}
              aria-label="AI Assistant"
              onClick={() => {
                props.onToggleAssistant();
                closeMenu();
              }}
            >
              AI Assistant
            </button>
            <button
              type="button"
              className={`icon-immersive ${immersive ? 'active' : ''}`}
              aria-label={immersive ? 'Exit full screen' : 'Enter full screen'}
              onClick={() => {
                props.onImmersiveToggle();
                closeMenu();
              }}
            >
              {immersive ? 'Exit Full' : 'Full Screen'}
            </button>
            <button
              type="button"
              className={`icon-toggle-menu ${menuHidden ? 'active' : ''}`}
              aria-label={menuHidden ? 'Show menu' : 'Hide menu'}
              onClick={() => {
                props.onToggleMenu();
                closeMenu();
              }}
            >
              {menuHidden ? 'Show Menu' : 'Hide Menu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
