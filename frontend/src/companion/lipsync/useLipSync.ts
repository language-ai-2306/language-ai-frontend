/**
 * useLipSync — plays a phrase's pre-generated audio and exposes the current
 * mouth shape (viseme) from its Rhubarb cue timeline.
 *
 * Assets (see tools/generate-lipsync.mjs) live in public/lipsync/<slug>.{wav,json}.
 * When they exist for the current phrase, `available` is true and the caller
 * should prefer this over the browser's TTS (which can't give viseme timing).
 *
 * The mouth shape + progress are updated from a rAF loop reading the audio's
 * currentTime against the cues — deterministic and in perfect sync with the
 * audio, with no runtime speech API.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { phraseSlug } from './slug';

export type MouthShape = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X';

interface Cue {
  start: number;
  end: number;
  value: MouthShape;
}

const BASE = import.meta.env.BASE_URL ?? '/';

export interface UseLipSync {
  /** True when audio + cues exist for the current phrase. */
  available: boolean;
  isPlaying: boolean;
  /** Current viseme ('X' when idle/silent). */
  mouthShape: MouthShape;
  /** 0..1 through the audio (for read-along word highlighting). */
  progress: number;
  play: () => void;
  stop: () => void;
}

export function useLipSync(phrase: string, rate = 1): UseLipSync {
  const slug = phraseSlug(phrase);
  const audioUrl = `${BASE}lipsync/${slug}.wav`;
  const cuesUrl = `${BASE}lipsync/${slug}.json`;
  const rateRef = useRef(rate);
  rateRef.current = rate;

  const [available, setAvailable] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mouthShape, setMouthShape] = useState<MouthShape>('X');
  const [progress, setProgress] = useState(0);

  const cuesRef = useRef<Cue[]>([]);
  const durationRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stopLoop();
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.onended = null;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setMouthShape('X');
    setProgress(0);
  }, [stopLoop]);

  // Load cues for the current phrase; mark availability. Stops any playback.
  useEffect(() => {
    let cancelled = false;
    stop();
    setAvailable(false);
    fetch(cuesUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no cues'))))
      .then((data: { duration?: number; mouthCues?: Cue[] }) => {
        if (cancelled) return;
        cuesRef.current = data.mouthCues ?? [];
        durationRef.current = data.duration ?? 0;
        setAvailable(cuesRef.current.length > 0);
      })
      .catch(() => {
        if (cancelled) return;
        cuesRef.current = [];
        setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cuesUrl, stop]);

  const play = useCallback(() => {
    if (!available) return;
    stop();
    const audio = new Audio(audioUrl);
    audio.playbackRate = rateRef.current; // slowed playback for clearer articulation
    audio.preservesPitch = true; // keep the voice pitch natural when slowed
    audioRef.current = audio;
    const cues = cuesRef.current;

    const tick = () => {
      const t = audio.currentTime;
      const cue = cues.find((c) => t >= c.start && t < c.end);
      setMouthShape(cue ? cue.value : 'X');
      const dur = audio.duration || durationRef.current;
      setProgress(dur ? Math.min(1, t / dur) : 0);
      rafRef.current = requestAnimationFrame(tick);
    };

    audio.onended = () => stop();
    setIsPlaying(true);
    void audio
      .play()
      .then(() => {
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => stop());
  }, [available, audioUrl, stop]);

  // Apply speed changes live, even mid-playback.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  useEffect(() => stop, [stop]); // cleanup on unmount

  return { available, isPlaying, mouthShape, progress, play, stop };
}
