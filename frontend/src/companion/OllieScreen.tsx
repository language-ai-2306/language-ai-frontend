/**
 * OllieScreen — live "Talk with Ollie" conversation, wired to the backend
 * (/v1/conversation). Ollie greets on mount; the child taps the mic to reply
 * (tap to start, tap to stop), the recording is uploaded, and Ollie's spoken
 * reply plays back with the avatar lip-syncing to the real voice.
 *
 * Reuses the immersive companion shell + shared controls.
 */
import { Suspense, useCallback, useEffect } from 'react';

import { useApp } from '../store/AppStore';
import { AvatarStage } from './components/AvatarStage';
import { BackButton } from './components/BackButton';
import { BirdLoader } from './components/BirdLoader';
import { MicrophoneButton, type MicVisualState } from './components/MicrophoneButton';
import { ReplayButton } from './components/ReplayButton';
import { useMicrophoneRecorder } from './hooks/useMicrophoneRecorder';
import { useOllieConversation } from './hooks/useOllieConversation';
import type { AvatarState } from './types';
import './companion.css';

const STATUS: Record<string, string> = {
  connecting: 'Waking Ollie up…',
  speaking: 'Ollie is talking…',
  ready: 'Your turn — tap the mic and talk!',
  listening: "I'm listening…",
  thinking: 'Ollie is thinking…',
  error: '',
};

function CompanionLoading(): JSX.Element {
  return (
    <div className="companion__loading">
      <BirdLoader label="Getting Ollie ready…" />
    </div>
  );
}

export function OllieScreen(): JSX.Element {
  const { navigate } = useApp();
  const convo = useOllieConversation();
  const recorder = useMicrophoneRecorder();

  // Greet on mount; end the session on exit.
  useEffect(() => {
    void convo.start();
    return () => convo.end();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { phase } = convo;
  const canSpeak = phase === 'ready';
  const isListening = phase === 'listening';

  const handleMic = useCallback(async () => {
    if (canSpeak) {
      if (recorder.supported) {
        const ok = await recorder.start();
        if (ok) convo.beginListening();
      }
    } else if (isListening) {
      convo.beginListening(); // keep UI in listening until upload starts
      const blob = await recorder.stop();
      if (blob) void convo.sendReply(blob);
    }
  }, [canSpeak, isListening, recorder, convo]);

  const handleBack = useCallback(() => {
    void recorder.stop();
    convo.end();
    navigate('home');
  }, [recorder, convo, navigate]);

  const avatarState: AvatarState = convo.isSpeaking
    ? 'speaking'
    : isListening
      ? 'listening'
      : phase === 'thinking'
        ? 'thinking'
        : 'idle';

  const micState: MicVisualState =
    phase === 'listening' ? 'listening' : phase === 'thinking' ? 'processing' : 'ready';
  const micDisabled = convo.isSpeaking || phase === 'connecting' || phase === 'thinking';
  const replayDisabled = convo.isSpeaking || phase !== 'ready';
  const status = convo.error ?? STATUS[phase] ?? '';

  return (
    <div className="companion companion--immersive">
      <div className="companion__room" aria-hidden="true" />

      <Suspense fallback={<CompanionLoading />}>
        <div className="companion__avatar">
          <AvatarStage
            state={avatarState}
            mouthOpen={convo.mouthOpen}
            micActive={recorder.isRecording}
            getLevel={recorder.getLevel}
          />
        </div>

        <div className="overlay-phrase">
          <span className="overlay-phrase__eyebrow">Talk with Ollie</span>
          <p className="overlay-phrase__text">{convo.ollieText}</p>
          <p
            className={`overlay-phrase__status${convo.error ? ' overlay-phrase__status--retry' : ''}`}
            role="status"
            aria-live="polite"
          >
            {recorder.error ?? status}
          </p>
        </div>

        <div className="overlay-dock">
          <BackButton onClick={handleBack} />
          <ReplayButton onClick={convo.replay} disabled={replayDisabled} playing={convo.isSpeaking} />
          <MicrophoneButton state={micState} onClick={handleMic} disabled={micDisabled} />
        </div>
      </Suspense>
    </div>
  );
}
