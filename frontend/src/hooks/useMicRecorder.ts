/**
 * useMicRecorder — records raw microphone audio via MediaRecorder.
 *
 * Used by the practice exercises so the user's ACTUAL speech (stutters,
 * repetitions, prolongations and all) is captured as audio, instead of being
 * silently "cleaned up" by a speech-to-text engine. The recorded blob is the
 * seam for the future backend AI analysis (see `submitAttempt` in api/client).
 */
import { useCallback, useRef, useState } from 'react';

export interface MicAttempt {
  blob: Blob;
  durationMs: number;
}

export interface UseMicRecorder {
  supported: boolean;
  isRecording: boolean;
  error: string | null;
  start: () => Promise<boolean>;
  stop: () => Promise<MicAttempt | null>;
}

export function useMicRecorder(): UseMicRecorder {
  const supported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window.MediaRecorder !== 'undefined';

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);

  const start = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setIsRecording(true);
      return true;
    } catch {
      setError('Microphone access was blocked. Allow it to record.');
      return false;
    }
  }, [supported]);

  const stop = useCallback((): Promise<MicAttempt | null> => {
    const recorder = recorderRef.current;
    if (!recorder) return Promise.resolve(null);
    return new Promise<MicAttempt | null>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const durationMs = Date.now() - startedAtRef.current;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setIsRecording(false);
        resolve({ blob, durationMs });
      };
      recorder.stop();
    });
  }, []);

  return { supported, isRecording, error, start, stop };
}
