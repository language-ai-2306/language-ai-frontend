/**
 * useMicRecorder — records raw microphone audio via MediaRecorder.
 *
 * Used by the practice exercises so the user's ACTUAL speech (stutters,
 * repetitions, prolongations and all) is captured as audio, instead of being
 * silently "cleaned up" by a speech-to-text engine.
 *
 * The recorder emits a chunk every `TIMESLICE_MS` so callers can stream those
 * chunks to the backend live (over a WebSocket — see api/audioSocket.ts) while
 * recording is still in progress. `stop()` also returns the fully-assembled
 * blob for local use/fallback.
 */
import { useCallback, useRef, useState } from 'react';

/** How often MediaRecorder hands us a chunk while recording (ms). */
const TIMESLICE_MS = 250;

/** Preferred capture formats, best first; the first supported one is used. */
const PREFERRED_MIME = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
];

export interface MicAttempt {
  blob: Blob;
  durationMs: number;
}

export interface UseMicRecorder {
  supported: boolean;
  isRecording: boolean;
  error: string | null;
  /**
   * Begin recording. `onChunk`, if given, is called with each audio chunk as it
   * is produced — wire it to a streaming uploader. Resolves true once recording
   * has actually started.
   */
  start: (onChunk?: (chunk: Blob) => void) => Promise<boolean>;
  stop: () => Promise<MicAttempt | null>;
  /** The mime type of the active/most-recent recording (known after start()). */
  getMimeType: () => string;
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined;
  return PREFERRED_MIME.find((t) => MediaRecorder.isTypeSupported(t));
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
  const mimeTypeRef = useRef<string>('audio/webm');
  const onChunkRef = useRef<((chunk: Blob) => void) | null>(null);

  const start = useCallback(
    async (onChunk?: (chunk: Blob) => void): Promise<boolean> => {
      if (!supported) return false;
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const mimeType = pickMimeType();
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        // Record the *base* container type (drop ";codecs=…"); the backend keys
        // its format allow-list on that.
        mimeTypeRef.current = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0];

        chunksRef.current = [];
        onChunkRef.current = onChunk ?? null;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
            onChunkRef.current?.(e.data);
          }
        };
        // Timeslice => periodic chunks, enabling live streaming as we record.
        recorder.start(TIMESLICE_MS);
        recorderRef.current = recorder;
        startedAtRef.current = Date.now();
        setIsRecording(true);
        return true;
      } catch {
        setError('Microphone access was blocked. Allow it to record.');
        return false;
      }
    },
    [supported],
  );

  const stop = useCallback((): Promise<MicAttempt | null> => {
    const recorder = recorderRef.current;
    if (!recorder) return Promise.resolve(null);
    return new Promise<MicAttempt | null>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        const durationMs = Date.now() - startedAtRef.current;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        onChunkRef.current = null;
        setIsRecording(false);
        resolve({ blob, durationMs });
      };
      recorder.stop();
    });
  }, []);

  const getMimeType = useCallback(() => mimeTypeRef.current, []);

  return { supported, isRecording, error, start, stop, getMimeType };
}
