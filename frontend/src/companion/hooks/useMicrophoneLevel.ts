/**
 * useMicrophoneLevel — drives a requestAnimationFrame loop while `active`,
 * sampling `getLevel()` and handing a smoothed 0..1 value to `onLevel` each
 * frame. `onLevel` should write to a ref / CSS variable, NOT React state, so the
 * animation never triggers re-renders.
 *
 * Pauses work when the page is hidden, honors reduced-motion (steady value, no
 * jitter), and always resets to 0 when it stops.
 */
import { useEffect, useRef } from 'react';

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export interface UseMicrophoneLevelOptions {
  active: boolean;
  getLevel: () => number;
  onLevel: (level: number) => void;
}

export function useMicrophoneLevel({ active, getLevel, onLevel }: UseMicrophoneLevelOptions): void {
  const rafRef = useRef<number | null>(null);
  const onLevelRef = useRef(onLevel);
  const getLevelRef = useRef(getLevel);
  onLevelRef.current = onLevel;
  getLevelRef.current = getLevel;

  useEffect(() => {
    if (!active) {
      onLevelRef.current(0);
      return;
    }
    if (prefersReducedMotion()) {
      onLevelRef.current(0.22); // calm, steady presence — no motion
      return;
    }

    let smooth = 0;
    const tick = () => {
      if (!document.hidden) {
        const raw = getLevelRef.current();
        smooth += (raw - smooth) * 0.25; // ease toward the target for soft motion
        onLevelRef.current(smooth);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      onLevelRef.current(0);
    };
  }, [active]);
}
