/**
 * useSwipeBack — "swipe left to go back" gesture for a screen.
 *
 * Attach the returned `handlers` to a screen's scroll root and apply `dragX`
 * as a translate: as the child drags left the screen follows, and releasing
 * past `threshold` fires `onBack` (otherwise it snaps home). Only engages for a
 * clearly-horizontal leftward drag, so vertical scrolling is untouched — pair
 * with `touch-action: pan-y` on the same element so the browser keeps handling
 * vertical pans while horizontal ones reach us.
 */
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export interface SwipeBackHandlers {
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerMove: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
  onPointerCancel: (e: ReactPointerEvent) => void;
}

export interface SwipeBack {
  handlers: SwipeBackHandlers;
  /** Current horizontal offset in px (≤ 0 — the screen only slides left). */
  dragX: number;
  /** True while a horizontal back-drag is engaged (disable the snap transition). */
  dragging: boolean;
  /** 0→1 progress toward triggering back, for driving hint feedback. */
  progress: number;
}

interface Options {
  /** Px the finger must travel left to trigger back on release. */
  threshold?: number;
  /** Px of leftward travel before the drag engages (filters taps/jitter). */
  activate?: number;
}

export function useSwipeBack(onBack: () => void, options: Options = {}): SwipeBack {
  const threshold = options.threshold ?? 90;
  const activate = options.activate ?? 10;

  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const engaged = useRef(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const reset = useCallback(() => {
    start.current = null;
    engaged.current = false;
    setDragging(false);
    setDragX(0);
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    if (!e.isPrimary) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    engaged.current = false;
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const s = start.current;
      if (!s || e.pointerId !== s.id) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;

      if (!engaged.current) {
        // Engage only for a clearly-horizontal leftward drag; bail on a vertical
        // one so the list keeps scrolling normally.
        if (dx < -activate && Math.abs(dx) > Math.abs(dy) * 1.4) {
          engaged.current = true;
          setDragging(true);
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
            /* capture unsupported — moves still arrive via the element */
          }
        } else if (Math.abs(dy) > 12) {
          start.current = null; // vertical scroll won — stop tracking this touch
          return;
        } else {
          return;
        }
      }
      // Follow the finger, but only leftwards (can't drag the screen right).
      setDragX(Math.min(0, dx));
    },
    [activate],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      const s = start.current;
      const triggered = engaged.current && s ? e.clientX - s.x <= -threshold : false;
      reset();
      if (triggered) onBack();
    },
    [onBack, reset, threshold],
  );

  const onPointerCancel = useCallback(() => reset(), [reset]);

  const progress = Math.min(1, Math.abs(dragX) / threshold);

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    dragX,
    dragging,
    progress,
  };
}
