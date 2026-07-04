/**
 * ExerciseScreen — the shared single-shot game screen for Repeat After Me, Read
 * It Loud, Picture Talk and Story Teller, wired to /v1/exercises/{game}. Ollie
 * says the prompt (base64 audio), the child records a reply, it's scored, and a
 * tap moves to the next prompt.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { useApp, type ExerciseKind, type GameDifficulty } from '../store/AppStore';
import { AvatarStage } from './components/AvatarStage';
import { BackButton } from './components/BackButton';
import { BirdLoader } from './components/BirdLoader';
import { MicrophoneButton, type MicVisualState } from './components/MicrophoneButton';
import { ReplayButton } from './components/ReplayButton';
import { useExerciseGame } from './hooks/useExerciseGame';
import { useMicrophoneRecorder } from './hooks/useMicrophoneRecorder';
import type { BackendDifficulty, GameSlug } from '../api/exercises';
import type { AvatarState } from './types';
import './companion.css';

const SLUG: Record<ExerciseKind, GameSlug> = {
  REPEAT_AFTER_ME: 'repeat-after-me',
  READ_IT_LOUD: 'read-it-loud',
  STORY_TELLER: 'story-teller',
  PICTURE_TALK: 'picture-talk',
  TALK_WITH_OLLIE: 'repeat-after-me', // never reached — Ollie has its own screen
};

const DIFF: Record<GameDifficulty, BackendDifficulty> = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
  twister: 'TONGUE_TWISTER',
};

const EYEBROW: Record<ExerciseKind, string> = {
  REPEAT_AFTER_ME: 'Repeat after me',
  READ_IT_LOUD: 'Read this out loud',
  STORY_TELLER: 'Listen, then tell the story',
  PICTURE_TALK: 'Tell me about this',
  TALK_WITH_OLLIE: 'Say this',
};

function CompanionLoading(): JSX.Element {
  return (
    <div className="companion__loading">
      <BirdLoader label="Getting your buddy ready…" />
    </div>
  );
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

/**
 * Picture Talk prompt image. The frame reserves its space immediately (fixed
 * aspect ratio) and shows a shimmer skeleton until the bitmap loads, then fades
 * the image in — so the phrase below never jumps. Resets on each new prompt.
 */
function ExerciseImage({ src }: { src: string }): JSX.Element {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [src]);
  return (
    <div className="exercise-image__frame">
      {!loaded && <span className="exercise-image__skeleton" aria-hidden="true" />}
      <img
        className={`exercise-image${loaded ? ' is-loaded' : ''}`}
        src={src}
        alt="Talk about this picture"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </div>
  );
}

export function ExerciseScreen(): JSX.Element {
  const { state, navigate } = useApp();
  const game = SLUG[state.currentGame];
  const difficulty = DIFF[state.gameDifficulty ?? 'easy'];
  const ex = useExerciseGame(game, difficulty, state.planItemId ?? undefined);
  const recorder = useMicrophoneRecorder();

  // Planned exercises run a countdown for the doctor-assigned minutes. The session
  // is only marked complete once the timer reaches 0. Free play has no timer.
  const isPlanned = !!state.planItemId;
  const durationSec = isPlanned && state.planItemDuration ? state.planItemDuration * 60 : 0;
  const hasTimer = durationSec > 0;
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [completed, setCompleted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    void ex.start();
    // Only stop audio on unmount — do NOT complete here (React StrictMode's
    // mount→unmount→remount would fire it early). Completion is timer-driven.
    return () => ex.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick the countdown once per second (planned only). Paused while the "leave
  // early?" warning is open, resumes when they choose to keep practising.
  useEffect(() => {
    if (!hasTimer || showWarning) return;
    const id = window.setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [hasTimer, showWarning]);

  // Time's up → mark the session COMPLETED (once) and celebrate. complete() and
  // stop() are fire-and-forget, so navigating away immediately is safe.
  useEffect(() => {
    if (hasTimer && timeLeft === 0 && !completedRef.current) {
      completedRef.current = true;
      setCompleted(true);
      ex.complete();
      void recorder.stop();
      navigate('taskComplete');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, hasTimer]);

  const { phase, content } = ex;
  const canSpeak = phase === 'ready';
  const isListening = phase === 'listening';

  const handleMic = useCallback(async () => {
    if (canSpeak) {
      if (recorder.supported) {
        const ok = await recorder.start();
        if (ok) ex.beginListening();
      }
    } else if (isListening) {
      ex.beginListening();
      const blob = await recorder.stop();
      if (blob) void ex.submit(blob);
      else ex.cancelListening("I didn't catch that — tap the mic and try again.");
    }
  }, [canSpeak, isListening, recorder, ex]);

  const handleBack = useCallback(() => {
    // Planned + timer still running → warn (leaving now = not completed).
    if (hasTimer && !completed) {
      setShowWarning(true);
      return;
    }
    void recorder.stop();
    ex.complete(); // planned (timed-out or no duration) → mark done; free play → no-op
    ex.stop();
    navigate('home');
  }, [hasTimer, completed, recorder, ex, navigate]);

  // Confirmed "leave anyway" while the timer's still running → do NOT complete.
  const leaveAnyway = useCallback(() => {
    void recorder.stop();
    ex.stop();
    navigate('home');
  }, [recorder, ex, navigate]);

  const avatarState: AvatarState = ex.isSpeaking
    ? 'speaking'
    : isListening
      ? 'listening'
      : phase === 'scoring'
        ? 'thinking'
        : 'idle';

  const micState: MicVisualState =
    phase === 'listening' ? 'listening' : phase === 'scoring' ? 'processing' : 'ready';
  const micDisabled = ex.isSpeaking || phase === 'loading' || phase === 'scoring';
  const replayDisabled = !content?.audio || ex.isSpeaking || isListening || phase === 'scoring';

  const STATUS: Record<string, string> = {
    loading: 'Getting your exercise…',
    speaking: 'Listen…',
    ready: 'Your turn — tap the mic!',
    listening: "I'm listening…",
    scoring: 'Checking your speech…',
    error: '',
  };
  const status = ex.error ?? STATUS[phase] ?? '';

  return (
    <div className="companion companion--immersive">
      <div className="companion__room" aria-hidden="true" />

      {hasTimer && (
        <div className={`ex-timer${completed ? ' ex-timer--done' : ''}`} aria-live="polite">
          {completed ? '✅ Time complete!' : `⏱️ ${fmtTime(timeLeft)}`}
        </div>
      )}

      <Suspense fallback={<CompanionLoading />}>
        <div className="companion__avatar">
          <AvatarStage
            state={avatarState}
            mouthOpen={ex.mouthOpen}
            micActive={recorder.isRecording}
            getLevel={recorder.getLevel}
          />
        </div>

        <div className={`overlay-phrase${hasTimer ? ' overlay-phrase--timer' : ''}`}>
          <span className="overlay-phrase__eyebrow">{EYEBROW[state.currentGame]}</span>
          {content?.image_url && <ExerciseImage src={content.image_url} />}
          {/* Story Teller is listen-and-retell — the child hears the story, so we
              don't show the text (that would be reading, not retelling). */}
          {state.currentGame !== 'STORY_TELLER' && (
            <p className="overlay-phrase__text">{content?.text ?? ''}</p>
          )}
          <p
            className={`overlay-phrase__status${ex.error ? ' overlay-phrase__status--retry' : ''}`}
            role="status"
            aria-live="polite"
          >
            {recorder.error ?? status}
          </p>
          {phase === 'error' && (
            <button type="button" className="overlay-retry" onClick={ex.retry}>
              Try again
            </button>
          )}
        </div>

        <div className="overlay-dock">
          <BackButton onClick={handleBack} />
          <ReplayButton onClick={ex.replay} disabled={replayDisabled} playing={ex.isSpeaking} />
          <MicrophoneButton state={micState} onClick={handleMic} disabled={micDisabled} />
        </div>
      </Suspense>

      {showWarning && (
        <div className="ex-modal" role="dialog" aria-modal="true">
          <div className="ex-modal__card">
            <span className="ex-modal__emoji" aria-hidden="true">
              ⏳
            </span>
            <h2 className="ex-modal__title">Almost there — keep going!</h2>
            <p className="ex-modal__body">
              You still have <strong>{fmtTime(timeLeft)}</strong> left on this exercise. If you leave
              now, it <strong>won&apos;t be marked complete</strong> — you&apos;ll have to start it
              over from the beginning next time.
            </p>
            <div className="ex-modal__actions">
              <button type="button" className="ex-modal__stay" onClick={() => setShowWarning(false)}>
                Keep practicing
              </button>
              <button type="button" className="ex-modal__leave" onClick={leaveAnyway}>
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
