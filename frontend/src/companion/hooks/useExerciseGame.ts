/**
 * useExerciseGame — drives a single-shot exercise (Repeat After Me, Read It Loud,
 * Picture Talk, Story Teller) against the unified backend (/v1/exercises/{game}):
 * start (intro) → content (prompt) → record → attempt (score) → auto-advance.
 *
 * Speed: the moment /attempt returns, the next /content is prefetched — so it
 * loads *while* the "great try, moving on" clip plays, and the next prompt is
 * ready by the time the clip finishes. Prompt/feedback voice is base64 audio
 * played through useAudioPlayer so the avatar lip-syncs.
 */
import { useCallback, useRef, useState } from 'react';

import { ApiError } from '../../api/client';
import {
  endExercise,
  getContent,
  getTechniqueIntro,
  startExercise,
  submitAttempt,
  type BackendDifficulty,
  type ExerciseContent,
  type GameSlug,
} from '../../api/exercises';
import { useAudioPlayer } from './useAudioPlayer';

export type ExercisePhase =
  | 'loading'
  | 'speaking' // playing intro / prompt / feedback audio
  | 'ready' // child can record
  | 'listening'
  | 'scoring' // uploading + awaiting analysis
  | 'error';

interface UseExerciseGame {
  phase: ExercisePhase;
  content: ExerciseContent | null;
  error: string | null;
  /** MEASURED-technique result from the last attempt (e.g. Syllable-Timed), or null. */
  techniqueMetric: Record<string, unknown> | null;
  mouthOpen: number;
  isSpeaking: boolean;
  start: () => void;
  /** Re-attempt after a load error (re-fetches the intro + first prompt). */
  retry: () => void;
  beginListening: () => void;
  /** Recording produced nothing → return to 'ready' with an optional note. */
  cancelListening: (message?: string) => void;
  submit: (audio: Blob) => Promise<void>;
  replay: () => void;
  /** For a planned exercise, mark today's session COMPLETED (/end). No-op for free
   *  play. Does NOT stop audio. */
  complete: () => void;
  stop: () => void;
}

export function useExerciseGame(
  game: GameSlug,
  difficulty: BackendDifficulty,
  planItemId?: string,
): UseExerciseGame {
  const player = useAudioPlayer();
  const [phase, setPhase] = useState<ExercisePhase>('loading');
  const [content, setContent] = useState<ExerciseContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Result of a MEASURED technique on the last attempt (e.g. Syllable-Timed CV-ISD).
  // Null for coaching techniques or before the first scored attempt.
  const [techniqueMetric, setTechniqueMetric] = useState<Record<string, unknown> | null>(null);
  const startedRef = useRef(false);
  // 1-based attempt count for the CURRENT phrase. Reset to 1 each time a new
  // prompt is shown; bumped on every retry. The backend caps retries with it.
  const attemptNoRef = useRef(1);
  // The technique whose intro/demo has already been played this session (so we
  // introduce it once, not on every phrase).
  const introducedTechRef = useRef<string | null>(null);

  // Planned play sends plan_item_id (backend derives difficulty/phoneme); free
  // play sends difficulty. This is the content-request shape for either mode.
  const contentOpts = planItemId ? { planItemId } : { difficulty };

  // Show a resolved prompt: set it, then play its spoken audio (if any) → ready.
  const showContent = useCallback(
    async (c: ExerciseContent): Promise<void> => {
      attemptNoRef.current = 1; // new phrase → back to the first attempt
      setTechniqueMetric(null); // clear last phrase's technique result
      setContent(c);
      // Play the technique intro (Ollie explains + demos) ONCE, the first time the
      // technique appears this session. Best-effort — never block the phrase.
      if (c.technique && introducedTechRef.current !== c.technique) {
        introducedTechRef.current = c.technique;
        try {
          const intro = await getTechniqueIntro(c.technique);
          if (intro.audio) {
            setPhase('speaking');
            await new Promise<void>((resolve) =>
              void player.play(intro.audio as string, 'audio/mpeg', resolve),
            );
          }
        } catch {
          /* spoken intro is non-critical — fall through to the phrase */
        }
      }
      if (c.audio) {
        setPhase('speaking');
        void player.play(c.audio, 'audio/mpeg', () => setPhase('ready'));
      } else {
        setPhase('ready');
      }
    },
    [player],
  );

  const loadContent = useCallback(async (): Promise<void> => {
    setError(null);
    setPhase('loading');
    try {
      await showContent(await getContent(game, contentOpts));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load the exercise.');
      setPhase('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, planItemId, difficulty, showContent]);

  // Await a prefetched next prompt (kicked off the instant /attempt returned).
  const applyNext = useCallback(
    async (nextPromise: Promise<ExerciseContent>): Promise<void> => {
      try {
        const c = await nextPromise;
        await showContent(c);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not load the next exercise.');
        setPhase('error');
      }
    },
    [showContent],
  );

  const start = useCallback(async (): Promise<void> => {
    if (startedRef.current) return;
    startedRef.current = true;
    setPhase('loading');
    try {
      const intro = await startExercise(game, planItemId);
      if (intro.audio) {
        setPhase('speaking');
        void player.play(intro.audio, 'audio/mpeg', () => void loadContent());
      } else {
        void loadContent();
      }
    } catch {
      void loadContent(); // intro is optional — go straight to the first prompt
    }
  }, [game, player, loadContent]);

  // Re-attempt after a failed load (resets the once-guard, replays intro + prompt).
  const retry = useCallback(() => {
    setError(null);
    startedRef.current = false;
    void start();
  }, [start]);

  const beginListening = useCallback(() => {
    setError(null); // clear any "didn't catch that" note when a new attempt starts
    setPhase('listening');
  }, []);

  // Recording produced no audio → back to 'ready' with a gentle note instead of
  // hanging in "listening…".
  const cancelListening = useCallback((message?: string) => {
    setError(message ?? null);
    setPhase('ready');
  }, []);

  const submit = useCallback(
    async (audio: Blob): Promise<void> => {
      const c = content;
      if (!c) return;
      setPhase('scoring');
      setError(null);
      try {
        const res = await submitAttempt(game, {
          contentId: c.content_id,
          audio,
          planItemId,
          attemptNumber: attemptNoRef.current,
          technique: c.technique ?? undefined,
        });
        setTechniqueMetric((res.technique_metric as Record<string, unknown> | null) ?? null);

        // Below the pass bar → stay on the SAME phrase so the child can try
        // again. The backend caps retries (returns should_retry=false once the
        // attempt limit is hit), so when it's false we always advance.
        if (res.should_retry) {
          attemptNoRef.current += 1;
          const backToReady = () => setPhase('ready'); // same prompt, ready to re-record
          if (res.feedback_audio) {
            setPhase('speaking');
            void player.play(res.feedback_audio, 'audio/mpeg', backToReady);
          } else {
            backToReady();
          }
          return;
        }

        // Passed (or retries exhausted) → advance. Prefetch the next prompt NOW,
        // so it loads while the feedback clip plays.
        const nextPromise = getContent(game, contentOpts);
        if (res.feedback_audio) {
          setPhase('speaking');
          void player.play(res.feedback_audio, 'audio/mpeg', () => void applyNext(nextPromise));
        } else {
          setPhase('loading');
          await applyNext(nextPromise);
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Something went wrong. Have another go!');
        setPhase('ready'); // let them retry the same prompt
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, planItemId, difficulty, content, player, applyNext],
  );

  const replay = useCallback(() => {
    if (content?.audio) {
      setPhase('speaking');
      // Always replay the PHRASE prompt — not player.replay(), which repeats the
      // last-played clip (on a retry that's the "try again" feedback, not the phrase).
      void player.play(content.audio, 'audio/mpeg', () => setPhase('ready'));
    }
  }, [content, player]);

  const stop = useCallback(() => player.stop(), [player]);

  const complete = useCallback(() => {
    // Planned exercise → mark today's session COMPLETED (best-effort). No-op free play.
    if (planItemId) void endExercise(game, planItemId).catch(() => undefined);
  }, [game, planItemId]);

  return {
    phase,
    content,
    error,
    techniqueMetric,
    mouthOpen: player.mouthOpen,
    isSpeaking: player.isPlaying,
    start,
    retry,
    beginListening,
    cancelListening,
    submit,
    replay,
    complete,
    stop,
  };
}
