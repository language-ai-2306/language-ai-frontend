/**
 * usePracticeSession — owns the practice state machine and (mock) feedback.
 *
 *   ready → listening → processing → success | retry → (next | retry) → ready
 *
 * Feedback is mocked with a short simulated delay so the whole experience runs
 * without a backend (out of scope for this prototype). The outcome is weighted
 * to success but both success and retry are reachable. Swapping the mock in
 * `endListening` for a real API call is the only change needed to go live.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { PHRASES, RETRY_FEEDBACK, START_INDEX, SUCCESS_FEEDBACK, randomFrom } from '../data';
import type { AvatarState, FeedbackResult, PracticePhase } from '../types';

const PROCESSING_MS = 1600;
const SUCCESS_HOLD_MS = 2400; // celebrate, then advance to the next phrase
const RETRY_HOLD_MS = 2000; // encourage, then return to ready (same phrase)

const PHASE_AVATAR: Record<PracticePhase, AvatarState> = {
  ready: 'idle',
  listening: 'listening',
  processing: 'thinking',
  success: 'celebrating',
  retry: 'encouraging',
};

const PHASE_STATUS: Record<PracticePhase, string> = {
  ready: 'Tap when you are ready',
  listening: 'I am listening. Take your time.',
  processing: 'Thinking about your attempt…',
  success: '',
  retry: '',
};

export interface UsePracticeSession {
  phase: PracticePhase;
  index: number;
  total: number;
  phrase: string;
  feedback: FeedbackResult | null;
  /** Mascot animation state derived from the phase. */
  avatarState: AvatarState;
  /** Supportive status line for the current phase. */
  statusMessage: string;
  beginListening: () => void;
  endListening: () => void;
  next: () => void;
  retry: () => void;
}

export function usePracticeSession(): UsePracticeSession {
  const [index, setIndex] = useState(START_INDEX);
  const [phase, setPhase] = useState<PracticePhase>('ready');
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const beginListening = useCallback(() => {
    clearTimer();
    setFeedback(null);
    setPhase('listening');
  }, [clearTimer]);

  const endListening = useCallback(() => {
    clearTimer();
    setPhase('processing');
    // Mock backend analysis. Replace with a real request when wiring the model.
    timerRef.current = window.setTimeout(() => {
      const success = Math.random() > 0.35;
      setFeedback(randomFrom(success ? SUCCESS_FEEDBACK : RETRY_FEEDBACK));
      setPhase(success ? 'success' : 'retry');
      // Auto-advance: no Next/Try-again buttons — the avatar reacts, then we
      // move on (success) or return to the same phrase (retry).
      timerRef.current = window.setTimeout(
        () => {
          setFeedback(null);
          if (success) setIndex((i) => (i + 1) % PHRASES.length);
          setPhase('ready');
        },
        success ? SUCCESS_HOLD_MS : RETRY_HOLD_MS,
      );
    }, PROCESSING_MS);
  }, [clearTimer]);

  const next = useCallback(() => {
    clearTimer();
    setFeedback(null);
    setIndex((i) => (i + 1) % PHRASES.length);
    setPhase('ready');
  }, [clearTimer]);

  const retry = useCallback(() => {
    clearTimer();
    setFeedback(null);
    setPhase('ready');
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return {
    phase,
    index,
    total: PHRASES.length,
    phrase: PHRASES[index],
    feedback,
    avatarState: PHASE_AVATAR[phase],
    statusMessage: feedback?.message ?? PHASE_STATUS[phase],
    beginListening,
    endListening,
    next,
    retry,
  };
}
