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

/** Successful phrases that make up one practice "level". */
export const PHRASES_PER_LEVEL = 3;

export interface PracticeSessionOptions {
  /** Successful phrases needed to finish the level. */
  phrasesPerLevel?: number;
  /** Fired once the level's successful-phrase goal is reached. */
  onLevelComplete?: () => void;
}

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
  /** Successful phrases completed so far in the current level (0..goal). */
  levelProgress: number;
  /** Successful phrases needed to finish the level. */
  levelGoal: number;
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

export function usePracticeSession(options: PracticeSessionOptions = {}): UsePracticeSession {
  const goal = options.phrasesPerLevel ?? PHRASES_PER_LEVEL;
  const [index, setIndex] = useState(START_INDEX);
  const [phase, setPhase] = useState<PracticePhase>('ready');
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [levelProgress, setLevelProgress] = useState(0);
  // Authoritative success count lives in a ref so the completion side-effect
  // stays out of the state updater (which StrictMode double-invokes in dev).
  const progressRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  // Keep the latest callback without re-arming timers / stale closures.
  const onCompleteRef = useRef(options.onLevelComplete);
  onCompleteRef.current = options.onLevelComplete;

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
          if (success) {
            // Count the win; finish the level once the goal is reached.
            const done = progressRef.current + 1;
            if (done >= goal) {
              progressRef.current = 0;
              setLevelProgress(0); // start the next level fresh
              onCompleteRef.current?.();
            } else {
              progressRef.current = done;
              setLevelProgress(done);
              setIndex((i) => (i + 1) % PHRASES.length);
            }
          }
          setPhase('ready');
        },
        success ? SUCCESS_HOLD_MS : RETRY_HOLD_MS,
      );
    }, PROCESSING_MS);
  }, [clearTimer, goal]);

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
    levelProgress,
    levelGoal: goal,
    feedback,
    avatarState: PHASE_AVATAR[phase],
    statusMessage: feedback?.message ?? PHASE_STATUS[phase],
    beginListening,
    endListening,
    next,
    retry,
  };
}
