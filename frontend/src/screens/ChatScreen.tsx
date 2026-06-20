/** Free chat — open voice/text conversation with the avatar. */
import { useCallback, useState } from 'react';

import { Avatar } from '../components/Avatar/Avatar';
import { ChatBar } from '../components/ChatBar/ChatBar';
import { ScreenHeader } from '../components/ui/ui';
import { useChat } from '../hooks/useChat';
import { useSpeech, type SpeakOptions } from '../hooks/useSpeech';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useApp } from '../store/AppStore';
import type { AvatarState, Mood } from '../types';

const VOICE_BY_MOOD: Record<Mood, SpeakOptions> = {
  neutral: { pitch: 1.05, rate: 1 },
  happy: { pitch: 1.15, rate: 1.02 },
  excited: { pitch: 1.25, rate: 1.1 },
  thinking: { pitch: 1, rate: 0.95 },
  sad: { pitch: 0.9, rate: 0.92 },
};

export function ChatScreen(): JSX.Element {
  const { state, navigate, award } = useApp();
  const sound = state.settings.sound;

  const { send, isLoading, error, clearError } = useChat();
  const { speak, cancel, isSpeaking, mouthOpen, supported } = useSpeech();

  const [mood, setMood] = useState<Mood>('happy');
  const [reply, setReply] = useState<string>("Hi! Tell me anything — I love to chat.");

  const handleSend = useCallback(
    async (message: string) => {
      clearError();
      const res = await send(message);
      if (!res) return;
      setMood(res.mood);
      setReply(res.reply);
      if (sound) speak(res.reply, VOICE_BY_MOOD[res.mood]);
      award({ xp: 15, stars: 1, exercise: 'chat', message: 'Great talking!' });
    },
    [send, speak, clearError, sound, award],
  );

  const recog = useSpeechRecognition({ onResult: handleSend });

  const toggleMic = useCallback(() => {
    if (recog.isListening) {
      recog.stop();
      return;
    }
    cancel();
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
    <div className="screen">
      <ScreenHeader title="Let's chat" onBack={() => navigate('home')} />

      <div className="stage">
        <Avatar mood={mood} state={avatarState} mouthOpen={mouthOpen} />
        <p className="bubble" aria-live="polite">
          {bubbleText}
        </p>
        {!supported && <p className="hint">Sound is off in this browser, but replies still show.</p>}
        {!recog.supported && (
          <p className="hint">Voice input needs Chrome, Edge, or Safari — you can still type.</p>
        )}
        {message && (
          <p className="error-msg" role="alert">
            {message}
          </p>
        )}
      </div>

      <ChatBar
        onSend={handleSend}
        disabled={isLoading || isSpeaking}
        micSupported={recog.supported}
        micDisabled={isLoading}
        isListening={recog.isListening}
        interim={recog.interim}
        onMicToggle={toggleMic}
      />
    </div>
  );
}
