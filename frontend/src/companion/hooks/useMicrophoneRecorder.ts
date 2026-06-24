/**
 * useMicrophoneRecorder — tap-to-start / tap-to-stop microphone capture.
 *
 * Records with MediaRecorder and, in parallel, wires a Web Audio AnalyserNode so
 * the UI can read an instantaneous input level (for subtle mascot reactions)
 * without re-rendering. All streams, tracks, and the AudioContext are cleaned up
 * on stop and on unmount. Microphone-permission denial is handled gracefully
 * with child-safe copy.
 *
 * Media logic is intentionally isolated here so a real backend upload can be
 * dropped in later without touching the UI.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const PERMISSION_ERROR =
  'We could not access the microphone. Ask a grown-up to check the microphone permission.';

export interface UseMicrophoneRecorder {
  supported: boolean;
  isRecording: boolean;
  error: string | null;
  /** Begin recording. Resolves false if unsupported or permission denied. */
  start: () => Promise<boolean>;
  /** Stop recording; resolves with the recorded audio (or null). */
  stop: () => Promise<Blob | null>;
  /** Instantaneous input level 0..1 (0 when not recording). Cheap; call per frame. */
  getLevel: () => number;
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

export function useMicrophoneRecorder(): UseMicrophoneRecorder {
  const supported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window.MediaRecorder !== 'undefined';

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      void audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    dataRef.current = null;
    recorderRef.current = null;
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (!supported) {
      setError(PERMISSION_ERROR);
      return false;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Analyser for real-time level (drives subtle mascot reactions only).
      const Ctx = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        dataRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      }

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      return true;
    } catch {
      cleanup();
      setError(PERMISSION_ERROR);
      return false;
    }
  }, [supported, cleanup]);

  const stop = useCallback((): Promise<Blob | null> => {
    const recorder = recorderRef.current;
    // Nothing to stop, or already stopped — settle immediately.
    if (!recorder || recorder.state === 'inactive') {
      cleanup();
      setIsRecording(false);
      return Promise.resolve(null);
    }
    return new Promise<Blob | null>((resolve) => {
      let settled = false;
      const finish = (blob: Blob | null) => {
        if (settled) return; // idempotent — onstop, catch, and the safety net all funnel here
        settled = true;
        cleanup();
        setIsRecording(false);
        resolve(blob);
      };
      recorder.onstop = () => {
        const blob = chunksRef.current.length
          ? new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
          : null;
        finish(blob);
      };
      try {
        recorder.stop();
      } catch {
        finish(null);
      }
      // Safety net: never let a missing 'stop' event hang the caller (which
      // would leave the mic button stuck in the recording state).
      window.setTimeout(() => finish(null), 1000);
    });
  }, [cleanup]);

  const getLevel = useCallback((): number => {
    const analyser = analyserRef.current;
    const data = dataRef.current;
    if (!analyser || !data) return 0;
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.min(1, rms * 2.4); // gentle gain so quiet voices still register
  }, []);

  // Safety net: release hardware if the component unmounts mid-recording.
  useEffect(() => cleanup, [cleanup]);

  return { supported, isRecording, error, start, stop, getLevel };
}
