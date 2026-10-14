import { useCallback, useRef, useState } from 'react';
import { downloadDataUrl } from '../utils/download';

interface BeforeAfterProps {
  before: string;
  after: string;
  filename?: string;
}

/**
 * Draggable before/after compare slider. Renders both images stacked and
 * clips the "after" image to the left of the drag handle, revealing the
 * "before" image on the right. Source images are immutable, so this is a
 * pure visual tool that does not affect edits or history.
 */
export function BeforeAfter({ before, after, filename = 'comparison.png' }: BeforeAfterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50); // percent, 0..100
  const [dragging, setDragging] = useState(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  const onDown = useCallback(
    (e: React.MouseEvent) => {
      setDragging(true);
      updateFromClientX(e.clientX);
    },
    [updateFromClientX],
  );
  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return;
      updateFromClientX(e.clientX);
    },
    [dragging, updateFromClientX],
  );
  const onUp = useCallback(() => {
    setDragging(false);
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setDragging(true);
      const t = e.touches[0];
      if (t) updateFromClientX(t.clientX);
    },
    [updateFromClientX],
  );
  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging) return;
      const t = e.touches[0];
      if (t) updateFromClientX(t.clientX);
    },
    [dragging, updateFromClientX],
  );

  const handleExport = useCallback(() => {
    downloadDataUrl(after, filename);
  }, [after, filename]);

  return (
    <div
      ref={containerRef}
      className="before-after"
      onMouseDown={onDown}
      onTouchStart={onTouchStart}
    >
      <img className="ba-before" src={before} alt="Before" draggable={false} />
      <div
        className="ba-after"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        onMouseMove={onMove}
        onTouchMove={onTouchMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchEnd={onUp}
        onTouchCancel={onUp}
      >
        <img className="ba-after-img" src={after} alt="After" draggable={false} />
      </div>
      <div className="ba-handle" style={{ left: `${position}%` }} aria-hidden="true">
        <div className="ba-handle-line" />
      </div>
      <button
        type="button"
        className="ba-export"
        onClick={handleExport}
        title="Export the edited photo"
      >
        Export
      </button>
    </div>
  );
}
