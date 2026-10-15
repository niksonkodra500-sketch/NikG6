import { useRef } from 'react';

export type PanelTab = 'adjust' | 'filters' | 'crop' | 'projects' | 'assistant';

interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  hasImage: boolean;
  activeTab: PanelTab | null;
  onOpenFiles: (files: FileList | null) => void;
  onTakePhoto: () => void;
  onPickFromLibrary: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRotate: () => void;
  onFlip: (axis: 'x' | 'y') => void;
  onReset: () => void;
  onExport: () => void;
  onCompare: () => void;
  onOpenProjects: () => void;
  onTabChange: (tab: PanelTab | null) => void;
}

export function Toolbar(props: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canUndo, canRedo, hasImage, activeTab } = props;

  return (
    <div className="toolbar" role="toolbar" aria-label="Editor toolbar">
      <div className="toolbar-group">
        <button
          type="button"
          className="icon-open"
          aria-label="Open"
          onClick={() => fileInputRef.current?.click()}
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
          onClick={props.onTakePhoto}
        >
          Camera
        </button>
        <button
          type="button"
          className="icon-library"
          aria-label="Pick from library"
          onClick={props.onPickFromLibrary}
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
          onClick={props.onUndo}
        >
          Undo
        </button>
        <button
          type="button"
          className="icon-redo"
          aria-label="Redo"
          disabled={!canRedo || !hasImage}
          onClick={props.onRedo}
        >
          Redo
        </button>
        <button
          type="button"
          className="icon-rotate"
          aria-label="Rotate 90°"
          disabled={!hasImage}
          onClick={props.onRotate}
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
          }}
        >
          Flip V
        </button>
        <button
          type="button"
          className="icon-reset"
          aria-label="Reset"
          disabled={!hasImage}
          onClick={props.onReset}
        >
          Reset
        </button>
        <button
          type="button"
          className="icon-export"
          aria-label="Export"
          disabled={!hasImage}
          onClick={props.onExport}
        >
          Export
        </button>
        <button
          type="button"
          className="icon-compare"
          aria-label="Compare before/after"
          disabled={!hasImage}
          onClick={props.onCompare}
        >
          Compare
        </button>
      </div>
      <div className="toolbar-group">
        <button
          type="button"
          className={`icon-adjust ${activeTab === 'adjust' ? 'active' : ''}`}
          aria-label="Adjustments"
          onClick={() => {
            props.onTabChange(activeTab === 'adjust' ? null : 'adjust');
          }}
        >
          Adjust
        </button>
        <button
          type="button"
          className={`icon-filters ${activeTab === 'filters' ? 'active' : ''}`}
          aria-label="Filters"
          onClick={() => {
            props.onTabChange(activeTab === 'filters' ? null : 'filters');
          }}
        >
          Filters
        </button>
        <button
          type="button"
          className={`icon-crop ${activeTab === 'crop' ? 'active' : ''}`}
          aria-label="Crop"
          onClick={() => {
            props.onTabChange(activeTab === 'crop' ? null : 'crop');
          }}
        >
          Crop
        </button>
        <button
          type="button"
          className={`icon-projects ${activeTab === 'projects' ? 'active' : ''}`}
          aria-label="Projects"
          onClick={props.onOpenProjects}
        >
          Projects
        </button>
        <button
          type="button"
          className={`icon-assistant ${activeTab === 'assistant' ? 'active' : ''}`}
          aria-label="AI Assistant"
          onClick={() => {
            props.onTabChange(activeTab === 'assistant' ? null : 'assistant');
          }}
        >
          AI Assistant
        </button>
      </div>
    </div>
  );
}
