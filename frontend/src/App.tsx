/** App — composes the avatar, speech (TTS + STT), and chat into the screen. */
import { useCallback, useState } from 'react';

import { Avatar } from './components/Avatar/Avatar';
import { ChatBar } from './components/ChatBar/ChatBar';
import { useChat } from './hooks/useChat';
import { useSpeech, type SpeakOptions } from './hooks/useSpeech';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import type { AvatarState, Mood } from './types';
import './App.css';

/** Map a mood to a playful voice profile for the avatar. */
const VOICE_BY_MOOD: Record<Mood, SpeakOptions> = {
  neutral: { pitch: 1.05, rate: 1 },
  happy: { pitch: 1.15, rate: 1.02 },
  excited: { pitch: 1.25, rate: 1.1 },
  thinking: { pitch: 1, rate: 0.95 },
  sad: { pitch: 0.9, rate: 0.92 },
};

export default function App(): JSX.Element {
  const { send, isLoading, error, clearError } = useChat();
  const { speak, cancel, isSpeaking, mouthOpen, supported } = useSpeech();

  const [mood, setMood] = useState<Mood>('neutral');
  const [reply, setReply] = useState<string>("Hi! I'm your avatar. Talk or type to me.");

  const handleSend = useCallback(
    async (message: string) => {
      clearError();
      const res = await send(message);
      if (!res) return;
      setMood(res.mood);
      setReply(res.reply);
      speak(res.reply, VOICE_BY_MOOD[res.mood]);
    },
    [send, speak, clearError],
  );

  // Voice input: transcribe speech, then run it through the same chat flow.
  const recog = useSpeechRecognition({ onResult: handleSend });

  const toggleMic = useCallback(() => {
    if (recog.isListening) {
      recog.stop();
      return;
    }
    cancel(); // stop any current speech so the avatar doesn't hear itself
    recog.start();
  }, [recog, cancel]);

  const avatarState: AvatarState = recog.isListening
    ? 'listening'
    : isLoading
      ? 'thinking'
      : isSpeaking
        ? 'talking'
        : 'idle';

  const bubbleText = recog.isListening ? recog.interim || 'Listening…' : reply;
  const message = error ?? recog.error;

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">LanguageAI</h1>
        <p className="app__subtitle">Your friendly talking avatar</p>
      </header>

      <section className="app__stage">
        <Avatar mood={mood} state={avatarState} mouthOpen={mouthOpen} />

        <p className="app__bubble" aria-live="polite">
          {bubbleText}
        </p>

        {!supported && (
          <p className="app__note">
            Your browser can&apos;t speak out loud, but the avatar will still show replies.
          </p>
        )}
        {!recog.supported && (
          <p className="app__note">Voice input needs Chrome, Edge, or Safari — you can still type.</p>
        )}
        {message && (
          <p className="app__error" role="alert">
            {message}
          </p>
        )}
      </section>

      <footer className="app__footer">
        <ChatBar
          onSend={handleSend}
          disabled={isLoading || isSpeaking}
          micSupported={recog.supported}
          micDisabled={isLoading}
          isListening={recog.isListening}
          interim={recog.interim}
          onMicToggle={toggleMic}
        />
      </footer>
    </main>
  );
}
