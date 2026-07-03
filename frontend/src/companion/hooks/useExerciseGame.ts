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
  mouthOpen: number;
  isSpeaking: boolean;
  start: () => void;
  beginListening: () => void;
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
  const startedRef = useRef(false);

  // Planned play sends plan_item_id (backend derives difficulty/phoneme); free
  // play sends difficulty. This is the content-request shape for either mode.
  const contentOpts = planItemId ? { planItemId } : { difficulty };

  // Show a resolved prompt: set it, then play its spoken audio (if any) → ready.
  const showContent = useCallback(
    (c: ExerciseContent): void => {
      setContent(c);
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
      showContent(await getContent(game, contentOpts));
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
        showContent(c);
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

  const beginListening = useCallback(() => setPhase('listening'), []);

  const submit = useCallback(
    async (audio: Blob): Promise<void> => {
      const c = content;
      if (!c) return;
      setPhase('scoring');
      setError(null);
      try {
        const res = await submitAttempt(game, { contentId: c.content_id, audio, planItemId });
        // Prefetch the next prompt NOW — it loads while the feedback clip plays.
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
      player.replay(() => setPhase('ready'));
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
    mouthOpen: player.mouthOpen,
    isSpeaking: player.isPlaying,
    start,
    beginListening,
    submit,
    replay,
    complete,
    stop,
  };
}
