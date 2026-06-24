/**
 * useSpeech — wraps the browser Web Speech API (speechSynthesis) and exposes a
 * `mouthOpen` amplitude (0..1) for lip-syncing the avatar.
 *
 * Lip-sync approach (no backend audio needed): while an utterance is playing we
 * run a requestAnimationFrame loop that oscillates the mouth with a bit of
 * pseudo-random noise, producing a cartoonish "Talking-Tom" flap. Word-boundary
 * events give the mouth an extra pop on each new word. Honors reduced-motion.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface SpeakOptions {
  /** 0..2, default 1.05 — a touch high for a friendly character voice. */
  pitch?: number;
  /** 0.1..10, default 1. */
  rate?: number;
}

export interface UseSpeech {
  speak: (text: string, opts?: SpeakOptions) => void;
  cancel: () => void;
  isSpeaking: boolean;
  /** 0 = closed, 1 = wide open. Drive the avatar mouth with this. */
  mouthOpen: number;
  /**
   * Character index in the utterance text where the word currently being spoken
   * begins (-1 when idle). Use it to highlight the active word for read-along.
   */
  charIndex: number;
  /** False when the browser has no speechSynthesis support. */
  supported: boolean;
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export function useSpeech(): UseSpeech {
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);
  // Where the currently-spoken word starts in the utterance text (-1 = idle).
  const [charIndex, setCharIndex] = useState(-1);

  const rafRef = useRef<number | null>(null);
  const speakingRef = useRef(false);
  // Extra openness injected on each word boundary, decaying over time.
  const wordPulseRef = useRef(0);
  const lastFrameRef = useRef(0);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setMouthOpen(0);
  }, []);

  const startLoop = useCallback(() => {
    if (rafRef.current !== null) return;
    const reduced = prefersReducedMotion();

    const tick = (now: number) => {
      if (!speakingRef.current) {
        stopLoop();
        return;
      }
      // Throttle to ~16fps for a chunky, character-like mouth and fewer renders.
      if (now - lastFrameRef.current >= 60) {
        lastFrameRef.current = now;
        if (reduced) {
          // Gentle, steady talking motion for reduced-motion users.
          setMouthOpen(0.35);
        } else {
          const base = 0.45 + 0.3 * Math.sin(now / 90);
          const noise = Math.random() * 0.25;
          const pulse = wordPulseRef.current;
          wordPulseRef.current = Math.max(0, pulse - 0.08);
          setMouthOpen(Math.min(1, Math.max(0, base + noise + pulse)));
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopLoop]);

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    speakingRef.current = false;
    setIsSpeaking(false);
    setCharIndex(-1);
    stopLoop();
  }, [supported, stopLoop]);

  const speak = useCallback(
    (text: string, opts?: SpeakOptions) => {
      if (!supported || !text.trim()) return;
      // Interrupt anything currently playing.
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.pitch = opts?.pitch ?? 1.05;
      utter.rate = opts?.rate ?? 1;

      utter.onstart = () => {
        speakingRef.current = true;
        setIsSpeaking(true);
        setCharIndex(-1);
        startLoop();
      };
      utter.onboundary = (e) => {
        wordPulseRef.current = 0.4; // pop the mouth on each new word
        if (e.name === undefined || e.name === 'word') setCharIndex(e.charIndex);
      };
      const finish = () => {
        speakingRef.current = false;
        setIsSpeaking(false);
        setCharIndex(-1);
        stopLoop();
      };
      utter.onend = finish;
      utter.onerror = finish;

      window.speechSynthesis.speak(utter);
    },
    [supported, startLoop, stopLoop],
  );

  // Clean up on unmount: stop audio and the animation loop.
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [supported]);

  return { speak, cancel, isSpeaking, mouthOpen, charIndex, supported };
}
