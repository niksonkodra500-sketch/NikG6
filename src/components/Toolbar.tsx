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
        <button type="button" onClick={() => fileInputRef.current?.click()}>
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
        <button type="button" onClick={props.onTakePhoto}>
          Camera
        </button>
        <button type="button" onClick={props.onPickFromLibrary}>
          Library
        </button>
      </div>
      <div className="toolbar-group">
        <button type="button" disabled={!canUndo || !hasImage} onClick={props.onUndo}>
          Undo
        </button>
        <button type="button" disabled={!canRedo || !hasImage} onClick={props.onRedo}>
          Redo
        </button>
        <button type="button" disabled={!hasImage} onClick={props.onRotate}>
          Rotate
        </button>
        <button
          type="button"
          disabled={!hasImage}
          onClick={() => {
            props.onFlip('x');
          }}
        >
          Flip H
        </button>
        <button
          type="button"
          disabled={!hasImage}
          onClick={() => {
            props.onFlip('y');
          }}
        >
          Flip V
        </button>
        <button type="button" disabled={!hasImage} onClick={props.onReset}>
          Reset
        </button>
        <button type="button" disabled={!hasImage} onClick={props.onExport}>
          Export
        </button>
        <button type="button" disabled={!hasImage} onClick={props.onCompare}>
          Compare
        </button>
      </div>
      <div className="toolbar-group">
        <button
          type="button"
          className={activeTab === 'adjust' ? 'active' : ''}
          onClick={() => {
            props.onTabChange(activeTab === 'adjust' ? null : 'adjust');
          }}
        >
          Adjust
        </button>
        <button
          type="button"
          className={activeTab === 'filters' ? 'active' : ''}
          onClick={() => {
            props.onTabChange(activeTab === 'filters' ? null : 'filters');
          }}
        >
          Filters
        </button>
        <button
          type="button"
          className={activeTab === 'crop' ? 'active' : ''}
          onClick={() => {
            props.onTabChange(activeTab === 'crop' ? null : 'crop');
          }}
        >
          Crop
        </button>
        <button
          type="button"
          className={activeTab === 'projects' ? 'active' : ''}
          onClick={props.onOpenProjects}
        >
          Projects
        </button>
        <button
          type="button"
          className={activeTab === 'assistant' ? 'active' : ''}
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
