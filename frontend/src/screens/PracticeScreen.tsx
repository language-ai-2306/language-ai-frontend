/**
 * PracticeScreen — shared engine for "Repeat after me" and "Read aloud".
 *
 * The avatar models the target (TTS); the user records their attempt. Every
 * attempt earns a star + praise — there is NO correct/incorrect, by design (the
 * users stutter, and that's welcome). The raw audio is handed to `submitAttempt`
 * for future AI analysis.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { submitAttempt } from '../api/client';
import { Avatar } from '../components/Avatar/Avatar';
import { MicButton } from '../components/MicButton';
import { Button, ScreenHeader } from '../components/ui/ui';
import { useMicRecorder } from '../hooks/useMicRecorder';
import { useSpeech } from '../hooks/useSpeech';
import { useApp, type Exercise } from '../store/AppStore';
import { PRAISE, randomFrom } from '../store/data';
import type { AvatarState } from '../types';

export interface PracticeScreenProps {
  title: string;
  exercise: Extract<Exercise, 'repeat' | 'read'>;
  items: string[];
  instruction: string;
  renderTarget: (item: string) => ReactNode;
  speakRate?: number;
}

export function PracticeScreen({
  title,
  exercise,
  items,
  instruction,
  renderTarget,
  speakRate = 1,
}: PracticeScreenProps): JSX.Element {
  const { state, navigate, award } = useApp();
  const { sound, simpleMode } = state.settings;

  const { speak, cancel, isSpeaking, mouthOpen } = useSpeech();
  const recorder = useMicRecorder();

  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const lastPraise = useRef<string | undefined>(undefined);

  const current = items[index];

  const model = useCallback(() => {
    cancel();
    speak(current, { rate: speakRate });
  }, [cancel, speak, current, speakRate]);

  // Model the target whenever it changes (best-effort — may need a first tap).
  useEffect(() => {
    if (sound) {
      cancel();
      speak(items[index], { rate: speakRate });
    }
    return () => cancel();
    // Intentionally only re-run when the target word changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const reward = useCallback(() => {
    const message = randomFrom(PRAISE, lastPraise.current);
    lastPraise.current = message;
    setDone(true);
    award({ xp: 20, stars: 1, exercise, word: current, message });
  }, [award, exercise, current]);

  const handleMic = useCallback(async () => {
    if (recorder.isRecording) {
      const attempt = await recorder.stop();
      reward();
      if (attempt) {
        submitAttempt(attempt.blob, {
          exercise,
          target: current,
          durationMs: attempt.durationMs,
        }).catch(() => undefined);
      }
    } else {
      cancel();
      await recorder.start();
    }
  }, [recorder, reward, cancel, exercise, current]);

  const next = useCallback(() => {
    setDone(false);
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const avatarState: AvatarState = recorder.isRecording
    ? 'listening'
    : isSpeaking
      ? 'talking'
      : 'idle';

  return (
    <div className="screen">
      <ScreenHeader title={title} onBack={() => navigate('home')} />

      <div className="stage">
        <Avatar mood="happy" state={avatarState} mouthOpen={mouthOpen} />
      </div>

      <div className="target-card">{renderTarget(current)}</div>

      {!simpleMode && <p className="hint">{instruction}</p>}

      <div className="controls-row">
        <Button variant="soft" size="md" onClick={model} disabled={recorder.isRecording}>
          🔊 Hear it
        </Button>

        {recorder.supported ? (
          <MicButton recording={recorder.isRecording} onClick={handleMic} />
        ) : (
          <Button variant="success" size="xl" onClick={reward}>
            I said it! 🎉
          </Button>
        )}

        <Button variant="primary" size="md" onClick={next} disabled={recorder.isRecording}>
          Next ›
        </Button>
      </div>

      {recorder.error && (
        <p className="hint" role="alert">
          {recorder.error}
        </p>
      )}

      <div className="progress-dots" aria-hidden="true">
        {items.map((item, i) => (
          <span
            key={item}
            className={[
              'dot',
              i < index || (i === index && done) ? 'dot--done' : '',
              i === index ? 'dot--current' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ))}
      </div>

      <div className="controls-row">
        <Button variant="ghost" size="md" onClick={() => navigate('summary')}>
          Finish &amp; see stars ⭐
        </Button>
      </div>
    </div>
  );
}
