/**
 * PracticeScreen — shared engine for "Repeat after me" and "Read aloud".
 *
 * The avatar models the target (TTS); the user records their attempt. Every
 * attempt earns a star + praise — there is NO correct/incorrect, by design (the
 * users stutter, and that's welcome). The raw audio is streamed to the backend
 * over a WebSocket as it's recorded (see api/audioSocket) for future AI analysis.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { AudioUploadSocket } from '../api/audioSocket';
import { Avatar } from '../components/Avatar/Avatar';
import { FeedbackCard } from '../components/FeedbackCard';
import { MicButton } from '../components/MicButton';
import { Button, ScreenHeader } from '../components/ui/ui';
import { useMicRecorder } from '../hooks/useMicRecorder';
import { useSpeech } from '../hooks/useSpeech';
import { useApp, type Exercise } from '../store/AppStore';
import { PRAISE, randomFrom } from '../store/data';
import type { AttemptFeedback, AvatarState } from '../types';

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
  // Backend is running the analysis pipeline on the just-recorded clip.
  const [analyzing, setAnalyzing] = useState(false);
  // Safe feedback for the latest attempt (null until one comes back).
  const [feedback, setFeedback] = useState<AttemptFeedback | null>(null);
  const lastPraise = useRef<string | undefined>(undefined);
  // Live audio-upload socket for the in-progress recording (null when idle).
  const uploaderRef = useRef<AudioUploadSocket | null>(null);

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
      const uploader = uploaderRef.current;
      uploaderRef.current = null;
      const attempt = await recorder.stop();
      reward();
      // Flush the final chunk, then wait for the backend's feedback. Upload
      // failures are swallowed so practice is never blocked by the network.
      if (uploader) {
        setAnalyzing(true);
        uploader
          .finish(attempt?.durationMs ?? 0)
          .then((fb) => setFeedback(fb))
          .catch(() => undefined)
          .finally(() => setAnalyzing(false));
      }
    } else {
      cancel();
      setFeedback(null);
      // Open the upload socket up-front so chunks stream as they're recorded.
      const uploader = new AudioUploadSocket();
      uploaderRef.current = uploader;
      const ok = await recorder.start((chunk) => uploader.sendChunk(chunk));
      if (ok) {
        uploader.begin({ exercise, target: current, mime: recorder.getMimeType() });
      } else {
        uploader.abort();
        uploaderRef.current = null;
      }
    }
  }, [recorder, reward, cancel, exercise, current]);

  const next = useCallback(() => {
    setDone(false);
    setFeedback(null);
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  // "Try again" — clear the feedback and immediately start a fresh recording.
  const retry = useCallback(() => {
    setFeedback(null);
    setDone(false);
    void handleMic();
  }, [handleMic]);

  const avatarState: AvatarState = recorder.isRecording
    ? 'listening'
    : analyzing
      ? 'thinking'
      : isSpeaking
        ? 'talking'
        : 'idle';

  const progress = (index + (done ? 1 : 0)) / items.length;

  return (
    <div className="screen screen--minimal">
      <ScreenHeader title={title} onBack={() => navigate('home')} />

      <div className="stage">
        <Avatar mood="happy" state={avatarState} mouthOpen={mouthOpen} />
      </div>

      <div className="target-card">{renderTarget(current)}</div>

      {feedback ? (
        <FeedbackCard feedback={feedback} target={current} onRetry={retry} onNext={next} />
      ) : (
        <>
          {!simpleMode && <p className="hint">{instruction}</p>}

          <div className="controls-row controls-row--practice">
            <Button
              variant="ghost"
              size="md"
              onClick={model}
              disabled={recorder.isRecording || analyzing}
            >
              ◌ Hear it
            </Button>

            {recorder.supported ? (
              <MicButton
                recording={recorder.isRecording}
                onClick={handleMic}
                disabled={analyzing}
              />
            ) : (
              <Button variant="success" size="xl" onClick={reward}>
                I said it!
              </Button>
            )}

            <Button
              variant="ghost"
              size="md"
              onClick={next}
              disabled={recorder.isRecording || analyzing}
            >
              Skip ›
            </Button>
          </div>

          {analyzing && (
            <p className="analyzing" role="status">
              <span className="analyzing__spinner" aria-hidden="true" />
              Listening…
            </p>
          )}

          {recorder.error && (
            <p className="hint" role="alert">
              {recorder.error}
            </p>
          )}
        </>
      )}

      <div className="practice-progress">
        <div
          className="practice-progress__track"
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={items.length}
        >
          <span className="practice-progress__fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="practice-progress__label">
          {index + 1} of {items.length}
        </span>
      </div>

      <div className="controls-row">
        <Button variant="ghost" size="md" onClick={() => navigate('summary')}>
          Finish
        </Button>
      </div>
    </div>
  );
}
