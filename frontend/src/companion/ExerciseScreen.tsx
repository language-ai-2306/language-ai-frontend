/**
 * ExerciseScreen — the shared single-shot game screen for Repeat After Me, Read
 * It Loud, Picture Talk and Story Teller, wired to /v1/exercises/{game}. Ollie
 * says the prompt (base64 audio), the child records a reply, it's scored, and a
 * tap moves to the next prompt.
 */
import { Suspense, useCallback, useEffect } from 'react';

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

export function ExerciseScreen(): JSX.Element {
  const { state, navigate } = useApp();
  const game = SLUG[state.currentGame];
  const difficulty = DIFF[state.gameDifficulty ?? 'easy'];
  const ex = useExerciseGame(game, difficulty, state.planItemId ?? undefined);
  const recorder = useMicrophoneRecorder();

  useEffect(() => {
    void ex.start();
    return () => ex.end(); // stop audio + (planned) complete today's session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    }
  }, [canSpeak, isListening, recorder, ex]);

  const handleBack = useCallback(() => {
    void recorder.stop();
    ex.end(); // planned → POST /end; free play → just stops audio
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

      <Suspense fallback={<CompanionLoading />}>
        <div className="companion__avatar">
          <AvatarStage
            state={avatarState}
            mouthOpen={ex.mouthOpen}
            micActive={recorder.isRecording}
            getLevel={recorder.getLevel}
          />
        </div>

        <div className="overlay-phrase">
          <span className="overlay-phrase__eyebrow">{EYEBROW[state.currentGame]}</span>
          {content?.image_url && (
            <img className="exercise-image" src={content.image_url} alt="Talk about this picture" />
          )}
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
        </div>

        <div className="overlay-dock">
          <BackButton onClick={handleBack} />
          <ReplayButton onClick={ex.replay} disabled={replayDisabled} playing={ex.isSpeaking} />
          <MicrophoneButton state={micState} onClick={handleMic} disabled={micDisabled} />
        </div>
      </Suspense>
    </div>
  );
}
