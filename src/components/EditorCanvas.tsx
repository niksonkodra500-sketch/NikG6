import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as fabric from 'fabric';
import { clampSlider } from '../editor/adjustments';
import { clampNumber } from '../editor/commands';
import { buildFabricFilters } from '../editor/fabricFilters';
import { History } from '../editor/history';
import {
  DEFAULT_SNAPSHOT,
  type AdjustmentName,
  type CropAspect,
  type EditorSnapshot,
  type ExportFormat,
  type FilterName,
  CROP_ASPECT_PRESETS,
} from '../editor/types';

export interface EditorHandle {
  loadFromFile(file: File): Promise<void>;
  loadFromDataUrl(dataUrl: string): Promise<void>;
  getSnapshot(): EditorSnapshot;
  restoreSnapshot(snapshot: EditorSnapshot): void;
  commit(): void;
  undo(): EditorSnapshot | null;
  redo(): EditorSnapshot | null;
  setAdjustment(name: AdjustmentName, value: number, opts?: { commit?: boolean }): void;
  applyFilter(filter: FilterName): void;
  crop(x: number, y: number, width: number, height: number, aspect?: number | null): void;
  cropToAspect(aspect: CropAspect): void;
  rotate(degrees: number): void;
  flip(axis: 'x' | 'y'): void;
  resize(width: number, height: number): void;
  autoEnhance(): void;
  reset(): void;
  exportImage(format: ExportFormat, quality: number): Promise<string>;
  getImageDataUrl(maxSize?: number): Promise<string | null>;
  hasImage(): boolean;
  getCanvasPixel(): { r: number; g: number; b: number };
  getNaturalSize(): { width: number; height: number };
}

interface EditorCanvasProps {
  onStateChange?: (snapshot: EditorSnapshot, hasImage: boolean) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  immersive?: boolean;
}

function freshSnapshot(): EditorSnapshot {
  return {
    adjustments: { ...DEFAULT_SNAPSHOT.adjustments },
    filter: 'none',
    transform: { ...DEFAULT_SNAPSHOT.transform },
    crop: null,
  };
}

export const EditorCanvas = forwardRef<EditorHandle, EditorCanvasProps>(
  function EditorCanvas(props, ref) {
    const onStateChangeRef = useRef(props.onStateChange);
    const onHistoryChangeRef = useRef(props.onHistoryChange);
    onStateChangeRef.current = props.onStateChange;
    onHistoryChangeRef.current = props.onHistoryChange;

    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const imageRef = useRef<fabric.FabricImage | null>(null);
    const naturalSizeRef = useRef({ width: 0, height: 0 });
    const stateRef = useRef<EditorSnapshot>(freshSnapshot());
    const historyRef = useRef<History<EditorSnapshot>>(new History(50));
    const lastCommittedRef = useRef<string>('');
    const [hasImage, setHasImage] = useState(false);

    const emitState = useCallback((snapshot: EditorSnapshot, loaded: boolean) => {
      onStateChangeRef.current?.(snapshot, loaded);
    }, []);

    const emitHistory = useCallback(() => {
      onHistoryChangeRef.current?.(historyRef.current.canUndo(), historyRef.current.canRedo());
    }, []);

    const applySnapshot = useCallback((snapshot: EditorSnapshot) => {
      const img = imageRef.current;
      const fc = fabricCanvasRef.current;
      if (!img || !fc) return;
      const natural = naturalSizeRef.current;

      img.filters = buildFabricFilters(snapshot.adjustments, snapshot.filter);
      img.applyFilters();
      img.set({
        angle: snapshot.transform.rotation,
        flipX: snapshot.transform.flipX,
        flipY: snapshot.transform.flipY,
        scaleX: snapshot.transform.scaleX,
        scaleY: snapshot.transform.scaleY,
      });

      const sourceW = snapshot.crop ? snapshot.crop.width : natural.width;
      const sourceH = snapshot.crop ? snapshot.crop.height : natural.height;
      if (snapshot.crop) {
        img.set({
          cropX: snapshot.crop.x,
          cropY: snapshot.crop.y,
          width: snapshot.crop.width,
          height: snapshot.crop.height,
        });
      } else {
        img.set({ cropX: 0, cropY: 0, width: natural.width, height: natural.height });
      }

      const displayW = sourceW * snapshot.transform.scaleX;
      const displayH = sourceH * snapshot.transform.scaleY;
      const normalizedAngle = ((snapshot.transform.rotation % 180) + 180) % 180;
      const swapped = Math.abs(normalizedAngle) === 90;
      fc.setDimensions({
        width: swapped ? displayH : displayW,
        height: swapped ? displayW : displayH,
      });
      img.set({ left: fc.getWidth() / 2, top: fc.getHeight() / 2 });
      fc.requestRenderAll();
    }, []);

    const commit = useCallback(() => {
      const json = JSON.stringify(stateRef.current);
      if (lastCommittedRef.current === json) return;
      lastCommittedRef.current = json;
      historyRef.current.push(stateRef.current);
      emitHistory();
    }, [emitHistory]);

    const undo = useCallback((): EditorSnapshot | null => {
      const prev = historyRef.current.undo(stateRef.current);
      if (!prev) return null;
      stateRef.current = prev;
      lastCommittedRef.current = JSON.stringify(prev);
      applySnapshot(prev);
      emitState(prev, true);
      emitHistory();
      return prev;
    }, [applySnapshot, emitHistory, emitState]);

    const redo = useCallback((): EditorSnapshot | null => {
      const next = historyRef.current.redo(stateRef.current);
      if (!next) return null;
      stateRef.current = next;
      lastCommittedRef.current = JSON.stringify(next);
      applySnapshot(next);
      emitState(next, true);
      emitHistory();
      return next;
    }, [applySnapshot, emitHistory, emitState]);

    const loadFromDataUrl = useCallback(
      async (dataUrl: string) => {
        const fc = fabricCanvasRef.current;
        if (!fc) return;
        const valid = await new Promise<boolean>((resolve) => {
          const probe = new Image();
          probe.onload = () => {
            resolve(true);
          };
          probe.onerror = () => {
            resolve(false);
          };
          probe.src = dataUrl;
        });
        if (!valid) throw new Error('Could not load the image');

        const img = await fabric.FabricImage.fromURL(dataUrl, {
          crossOrigin: 'anonymous',
        });

        const element = img.getElement() as HTMLImageElement;
        const natural = {
          width: element.naturalWidth || img.width || 0,
          height: element.naturalHeight || img.height || 0,
        };
        naturalSizeRef.current = natural;

        const snapshot = freshSnapshot();
        stateRef.current = snapshot;
        lastCommittedRef.current = JSON.stringify(snapshot);
        historyRef.current.clear();
        historyRef.current.push(snapshot);

        fc.clear();
        img.set({
          left: natural.width / 2,
          top: natural.height / 2,
          originX: 'center',
          originY: 'center',
        });
        fc.setDimensions({ width: natural.width, height: natural.height });
        fc.add(img);
        imageRef.current = img;
        fc.renderAll();
        setHasImage(true);
        emitState(snapshot, true);
        emitHistory();
      },
      [emitHistory, emitState],
    );

    const setAdjustment = useCallback(
      (name: AdjustmentName, value: number, opts?: { commit?: boolean }) => {
        const current = stateRef.current;
        const next: EditorSnapshot = {
          ...current,
          adjustments: { ...current.adjustments, [name]: clampSlider(value) },
        };
        stateRef.current = next;
        applySnapshot(next);
        emitState(next, true);
        if (opts?.commit !== false) commit();
      },
      [applySnapshot, commit, emitState],
    );

    const applyFilter = useCallback(
      (filter: FilterName) => {
        const current = stateRef.current;
        const next: EditorSnapshot = { ...current, filter };
        stateRef.current = next;
        applySnapshot(next);
        emitState(next, true);
        commit();
      },
      [applySnapshot, commit, emitState],
    );

    const crop = useCallback(
      (x: number, y: number, width: number, height: number, aspect?: number | null) => {
        const natural = naturalSizeRef.current;
        if (!natural.width || !natural.height) return;
        const cx = clampNumber(x, 0, natural.width - 1, 0);
        const cy = clampNumber(y, 0, natural.height - 1, 0);
        const cw = clampNumber(width, 1, natural.width - cx, 1);
        const ch = clampNumber(height, 1, natural.height - cy, 1);
        const current = stateRef.current;
        const next: EditorSnapshot = {
          ...current,
          crop: {
            x: Math.round(cx),
            y: Math.round(cy),
            width: Math.round(cw),
            height: Math.round(ch),
            aspect: aspect ?? current.crop?.aspect ?? null,
          },
        };
        stateRef.current = next;
        applySnapshot(next);
        emitState(next, true);
        commit();
      },
      [applySnapshot, commit, emitState],
    );

    const cropToAspect = useCallback(
      (aspect: CropAspect) => {
        const natural = naturalSizeRef.current;
        if (!natural.width || !natural.height) return;
        const presets = CROP_ASPECT_PRESETS as Array<{ ratio: CropAspect; value: number | null }>;
        const preset = presets.find((p) => p.ratio === aspect);
        const ratio = preset?.value ?? null;
        if (ratio === null) {
          stateRef.current = { ...stateRef.current, crop: null };
          applySnapshot(stateRef.current);
          emitState(stateRef.current, true);
          commit();
          return;
        }
        let w = natural.width;
        let h = Math.round(w / ratio);
        if (h > natural.height) {
          h = natural.height;
          w = Math.round(h * ratio);
        }
        const x = Math.round((natural.width - w) / 2);
        const y = Math.round((natural.height - h) / 2);
        const next: EditorSnapshot = {
          ...stateRef.current,
          crop: { x, y, width: w, height: h, aspect: ratio },
        };
        stateRef.current = next;
        applySnapshot(next);
        emitState(next, true);
        commit();
      },
      [applySnapshot, commit, emitState],
    );

    const rotate = useCallback(
      (degrees: number) => {
        const current = stateRef.current;
        let nextAngle = (current.transform.rotation + degrees) % 360;
        if (nextAngle > 180) nextAngle -= 360;
        if (nextAngle <= -180) nextAngle += 360;
        const next: EditorSnapshot = {
          ...current,
          transform: { ...current.transform, rotation: nextAngle },
        };
        stateRef.current = next;
        applySnapshot(next);
        emitState(next, true);
        commit();
      },
      [applySnapshot, commit, emitState],
    );

    const flip = useCallback(
      (axis: 'x' | 'y') => {
        const current = stateRef.current;
        const next: EditorSnapshot = {
          ...current,
          transform: {
            ...current.transform,
            flipX: axis === 'x' ? !current.transform.flipX : current.transform.flipX,
            flipY: axis === 'y' ? !current.transform.flipY : current.transform.flipY,
          },
        };
        stateRef.current = next;
        applySnapshot(next);
        emitState(next, true);
        commit();
      },
      [applySnapshot, commit, emitState],
    );

    const resize = useCallback(
      (width: number, height: number) => {
        const natural = naturalSizeRef.current;
        const cropState = stateRef.current.crop;
        const sourceW = cropState ? cropState.width : natural.width;
        const sourceH = cropState ? cropState.height : natural.height;
        if (!sourceW || !sourceH) return;
        const w = clampNumber(width, 1, 100_000, sourceW);
        const h = clampNumber(height, 1, 100_000, sourceH);
        const current = stateRef.current;
        const next: EditorSnapshot = {
          ...current,
          transform: { ...current.transform, scaleX: w / sourceW, scaleY: h / sourceH },
        };
        stateRef.current = next;
        applySnapshot(next);
        emitState(next, true);
        commit();
      },
      [applySnapshot, commit, emitState],
    );

    const autoEnhance = useCallback(() => {
      const current = stateRef.current;
      const next: EditorSnapshot = {
        ...current,
        adjustments: {
          ...current.adjustments,
          brightness: clampSlider(current.adjustments.brightness + 10),
          contrast: clampSlider(current.adjustments.contrast + 15),
          saturation: clampSlider(current.adjustments.saturation + 10),
          temperature: clampSlider(current.adjustments.temperature + 10),
        },
      };
      stateRef.current = next;
      applySnapshot(next);
      emitState(next, true);
      commit();
    }, [applySnapshot, commit, emitState]);

    const reset = useCallback(() => {
      const snapshot = freshSnapshot();
      stateRef.current = snapshot;
      applySnapshot(snapshot);
      emitState(snapshot, true);
      commit();
    }, [applySnapshot, commit, emitState]);

    const exportImage = useCallback((format: ExportFormat, quality: number): Promise<string> => {
      const fc = fabricCanvasRef.current;
      if (!fc || !imageRef.current) {
        return Promise.reject(new Error('No image loaded'));
      }
      return Promise.resolve(fc.toDataURL({ format, quality, multiplier: 1 }));
    }, []);

    // When maxSize is Infinity the image is read at full (natural) resolution,
    // i.e. no downscaling cap — "infinity" file read for the AI assistant's vision.
    const getImageDataUrl = useCallback((maxSize = Infinity): Promise<string | null> => {
      const fc = fabricCanvasRef.current;
      if (!fc || !imageRef.current) return Promise.resolve(null);
      const maxDim = Math.max(fc.getWidth(), fc.getHeight());
      const multiplier = Math.min(1, maxSize / Math.max(1, maxDim));
      return Promise.resolve(fc.toDataURL({ format: 'jpeg', quality: 0.8, multiplier }));
    }, []);

    const checkHasImage = useCallback(() => imageRef.current !== null, []);

    const getCanvasPixel = useCallback(() => {
      const fc = fabricCanvasRef.current;
      if (!fc) throw new Error('No canvas');
      const ctx = fc.lowerCanvasEl.getContext('2d');
      if (!ctx) throw new Error('No canvas context');
      const w = fc.getWidth();
      const h = fc.getHeight();
      const data = ctx.getImageData(Math.floor(w / 2), Math.floor(h / 2), 1, 1).data;
      return { r: data[0], g: data[1], b: data[2] };
    }, []);

    const getNaturalSize = useCallback(() => naturalSizeRef.current, []);

    useEffect(() => {
      if (!canvasElRef.current) return;
      const fc = new fabric.Canvas(canvasElRef.current, { preserveObjectStacking: true });
      fabricCanvasRef.current = fc;
      return () => {
        void fc.dispose();
        fabricCanvasRef.current = null;
      };
    }, []);

    const handle = useMemo<EditorHandle>(
      () => ({
        loadFromFile: async (file: File) => {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve(reader.result as string);
            };
            reader.onerror = () => {
              reject(new Error('Could not read the file'));
            };
            reader.readAsDataURL(file);
          });
          return loadFromDataUrl(dataUrl);
        },
        loadFromDataUrl,
        getSnapshot: () => stateRef.current,
        restoreSnapshot: (snapshot: EditorSnapshot) => {
          stateRef.current = snapshot;
          applySnapshot(snapshot);
          emitState(snapshot, true);
          commit();
        },
        commit,
        undo,
        redo,
        setAdjustment,
        applyFilter,
        crop,
        rotate,
        flip,
        resize,
        autoEnhance,
        reset,
        exportImage,
        getImageDataUrl,
        hasImage: checkHasImage,
        getCanvasPixel,
        getNaturalSize,
        cropToAspect,
      }),
      [
        applyFilter,
        applySnapshot,
        checkHasImage,
        commit,
        crop,
        cropToAspect,
        emitState,
        exportImage,
        flip,
        getCanvasPixel,
        getImageDataUrl,
        getNaturalSize,
        loadFromDataUrl,
        redo,
        reset,
        resize,
        rotate,
        setAdjustment,
        undo,
        autoEnhance,
      ],
    );

    useImperativeHandle(ref, () => handle, [handle]);

    useEffect(() => {
      window.__editorHandle = handle;
      return () => {
        delete window.__editorHandle;
      };
    }, [handle]);

    return (
      <div className={`editor-canvas-wrap${hasImage ? ' has-image' : ''}`}>
        <canvas ref={canvasElRef} />
        {!hasImage && (
          <div className="editor-placeholder">
            <span className="icon" aria-hidden="true">
              🎨
            </span>
            <p>Open an image to start editing</p>
          </div>
        )}
      </div>
    );
  },
);
