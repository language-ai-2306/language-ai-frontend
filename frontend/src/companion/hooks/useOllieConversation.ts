/**
 * useOllieConversation — drives a live "Talk with Ollie" session against the
 * backend (/v1/conversation): start → (record → reply)* → end. Ollie's voice is
 * the base64 audio each response carries, played through useAudioPlayer so the
 * avatar lip-syncs to it.
 */
import { useCallback, useRef, useState } from 'react';

import { ApiError } from '../../api/client';
import { endConversation, startConversation, submitReply } from '../../api/conversation';
import { useAudioPlayer } from './useAudioPlayer';

/** connecting → speaking (Ollie talks) → ready (child's turn) → listening →
 *  thinking (uploading/awaiting reply) → speaking … ; error on failure. */
export type OlliePhase =
  | 'connecting'
  | 'speaking'
  | 'ready'
  | 'listening'
  | 'thinking'
  | 'error';

interface UseOllieConversation {
  phase: OlliePhase;
  ollieText: string;
  transcript: string | null; // the child's last transcribed reply
  error: string | null;
  mouthOpen: number;
  isSpeaking: boolean;
  start: () => void; // begin the session (call once, on mount)
  retry: () => void; // re-attempt after a connection error
  beginListening: () => void; // recording started
  cancelListening: (message?: string) => void; // recording produced nothing → back to ready
  sendReply: (audio: Blob) => Promise<void>; // recording stopped → upload
  replay: () => void; // hear Ollie's last line again
  end: () => void; // end the session (on exit)
}

export function useOllieConversation(): UseOllieConversation {
  const player = useAudioPlayer();
  const [phase, setPhase] = useState<OlliePhase>('connecting');
  const [ollieText, setOllieText] = useState('');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  const speak = useCallback(
    (audio: string) => {
      setPhase('speaking');
      void player.play(audio, 'audio/mpeg', () => setPhase('ready'));
    },
    [player],
  );

  const start = useCallback(async (): Promise<void> => {
    if (startedRef.current) return; // guard React StrictMode double-invoke
    startedRef.current = true;
    setPhase('connecting');
    setError(null);
    try {
      const res = await startConversation();
      sessionRef.current = res.session_id;
      setOllieText(res.text);
      speak(res.audio);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach Ollie. Please try again.');
      setPhase('error');
    }
  }, [speak]);

  // Re-attempt the greeting after a connection error (resets the once-guard).
  const retry = useCallback(() => {
    setError(null);
    startedRef.current = false;
    void start();
  }, [start]);

  const beginListening = useCallback(() => {
    setError(null); // clear any "didn't catch that" note when a new turn starts
    setPhase('listening');
  }, []);

  // Recording produced no audio (empty / too short) → return to the child's turn
  // with a gentle note, instead of hanging in "listening…".
  const cancelListening = useCallback((message?: string) => {
    setError(message ?? null);
    setPhase('ready');
  }, []);

  const sendReply = useCallback(
    async (audio: Blob): Promise<void> => {
      const sid = sessionRef.current;
      if (!sid) return;
      setPhase('thinking');
      setError(null);
      try {
        const res = await submitReply(sid, audio);
        setTranscript(res.child_transcript);
        setOllieText(res.text);
        speak(res.audio);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Something went wrong. Have another go!');
        setPhase('ready'); // let the child retry their turn
      }
    },
    [speak],
  );

  const replay = useCallback(() => {
    setPhase('speaking');
    player.replay(() => setPhase('ready'));
  }, [player]);

  const end = useCallback(() => {
    const sid = sessionRef.current;
    player.stop();
    if (sid) void endConversation(sid).catch(() => undefined);
  }, [player]);

  return {
    phase,
    ollieText,
    transcript,
    error,
    mouthOpen: player.mouthOpen,
    isSpeaking: player.isPlaying,
    start,
    retry,
    beginListening,
    cancelListening,
    sendReply,
    replay,
    end,
  };
}
