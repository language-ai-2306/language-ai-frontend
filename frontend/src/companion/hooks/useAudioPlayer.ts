/**
 * useAudioPlayer — play a base64 audio clip (the backend's TTS voice) through the
 * Web Audio API, exposing a live `mouthOpen` amplitude so the 3D avatar can
 * lip-sync to the actual voice. Remembers the last clip for replay.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

interface UseAudioPlayer {
  isPlaying: boolean;
  /** 0..1, updated per frame while playing (feed the avatar's mouth). */
  mouthOpen: number;
  play: (base64: string, mime?: string, onEnded?: () => void) => Promise<void>;
  replay: (onEnded?: () => void) => void;
  stop: () => void;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function useAudioPlayer(): UseAudioPlayer {
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<{ base64: string; mime: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const src = srcRef.current;
    if (src) {
      src.onended = null;
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
      src.disconnect();
      srcRef.current = null;
    }
    setIsPlaying(false);
    setMouthOpen(0);
  }, []);

  const play = useCallback(
    async (base64: string, mime = 'audio/mpeg', onEnded?: () => void): Promise<void> => {
      lastRef.current = { base64, mime };
      stop();

      const Ctx = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
      if (!Ctx) {
        onEnded?.();
        return;
      }
      const ctx = ctxRef.current ?? new Ctx();
      ctxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();

      let buffer: AudioBuffer;
      try {
        buffer = await ctx.decodeAudioData(base64ToBytes(base64).buffer as ArrayBuffer);
      } catch {
        onEnded?.(); // undecodable audio shouldn't stall the conversation
        return;
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      srcRef.current = src;

      const data = new Uint8Array(analyser.fftSize);
      const tick = (): void => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        setMouthOpen(Math.min(1, rms * 3)); // scale RMS into a visible open range
        rafRef.current = requestAnimationFrame(tick);
      };

      src.onended = (): void => {
        stop();
        onEnded?.();
      };
      setIsPlaying(true);
      src.start();
      tick();
    },
    [stop],
  );

  const replay = useCallback(
    (onEnded?: () => void): void => {
      if (lastRef.current) void play(lastRef.current.base64, lastRef.current.mime, onEnded);
    },
    [play],
  );

  useEffect(
    () => () => {
      stop();
      if (ctxRef.current && ctxRef.current.state !== 'closed') void ctxRef.current.close();
    },
    [stop],
  );

  return { isPlaying, mouthOpen, play, replay, stop };
}
