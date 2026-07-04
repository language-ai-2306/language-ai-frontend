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

/**
 * A single AudioContext shared by every player instance. Mobile browsers (iOS
 * Safari especially, and strict desktop ones) only let audio start from within a
 * user gesture — but Ollie's greeting/replies play from an async network
 * callback, long after the tap that opened the screen. By creating this one
 * context and resuming it on the *first* pointer/touch/key event, every later
 * play() is already unlocked, so the voice actually plays. Without this, you get
 * no sound AND no mouth movement (the analyser never runs) on every device.
 */
let sharedCtx: AudioContext | null = null;
let unlockArmed = false;

function getSharedCtx(): AudioContext | null {
  const Ctx = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx) sharedCtx = new Ctx();
  return sharedCtx;
}

/** Resume the shared context on the first user gesture (once per app load). */
function armAudioUnlock(): void {
  if (unlockArmed || typeof document === 'undefined') return;
  unlockArmed = true;
  const unlock = (): void => {
    const c = getSharedCtx();
    if (c && c.state !== 'running') void c.resume();
  };
  // Not { once: true } — re-unlock after any iOS interruption too. Idempotent.
  for (const ev of ['pointerdown', 'touchend', 'keydown', 'click']) {
    document.addEventListener(ev, unlock, { passive: true });
  }
}

// Arm at module load so the earliest tap anywhere in the app (login, home,
// entering a game) unlocks audio — before Ollie's greeting ever fires.
armAudioUnlock();

export function useAudioPlayer(): UseAudioPlayer {
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<{ base64: string; mime: string } | null>(null);
  // Generation token, bumped on every stop()/new play(). An in-flight play() that
  // was awaiting resume()/decode compares against it and bails before starting
  // audio if it changed — so tapping Back mid-load can't leave a clip playing.
  const tokenRef = useRef(0);
  // Set once the hook unmounts, so a play() from a late network callback (a reply
  // that lands after you've left the screen) stays silent too.
  const disposedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);

  const stop = useCallback(() => {
    tokenRef.current += 1; // invalidate any in-flight play()
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
    // Disconnect the analyser too — otherwise it stays wired to destination and
    // one dangling node accumulates per clip over a long session.
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    setIsPlaying(false);
    setMouthOpen(0);
  }, []);

  const play = useCallback(
    async (base64: string, mime = 'audio/mpeg', onEnded?: () => void): Promise<void> => {
      lastRef.current = { base64, mime };
      stop(); // tear down any current clip and bump the generation token

      // This play's generation. If stop() runs again (Back) or the hook unmounts
      // while we await resume()/decode below, alive() turns false and we bail
      // *before* starting audio — so leaving the screen can't leave a clip playing.
      const myToken = tokenRef.current;
      const alive = (): boolean => tokenRef.current === myToken && !disposedRef.current;

      const ctx = getSharedCtx();
      if (!ctx) {
        onEnded?.();
        return;
      }
      try {
        // Resume from 'suspended' and iOS Safari's 'interrupted' state. The
        // first-gesture unlock normally has the shared context running already.
        if (ctx.state !== 'running') await ctx.resume();
      } catch {
        if (alive()) onEnded?.(); // autoplay blocked / context failed — don't stall the flow
        return;
      }
      if (!alive()) return; // cancelled while resuming → stay silent

      let buffer: AudioBuffer;
      try {
        buffer = await ctx.decodeAudioData(base64ToBytes(base64).buffer as ArrayBuffer);
      } catch {
        if (alive()) onEnded?.(); // undecodable audio shouldn't stall the conversation
        return;
      }
      if (!alive() || ctx.state === 'closed') return; // cancelled while decoding → don't play

      try {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        analyser.connect(ctx.destination);
        srcRef.current = src;
        analyserRef.current = analyser;

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
      } catch {
        // Setup/start failed — reset so isPlaying/srcRef don't stick, then let
        // the flow continue (don't bump the token, so alive() stays true).
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        if (analyserRef.current) {
          analyserRef.current.disconnect();
          analyserRef.current = null;
        }
        srcRef.current = null;
        setIsPlaying(false);
        setMouthOpen(0);
        if (alive()) onEnded?.(); // context torn down mid-setup — don't stall the flow
      }
    },
    [stop],
  );

  const replay = useCallback(
    (onEnded?: () => void): void => {
      if (lastRef.current) void play(lastRef.current.base64, lastRef.current.mime, onEnded);
    },
    [play],
  );

  // Re-arm on every (re)mount, THEN block on teardown. React StrictMode runs
  // effects setup→cleanup→setup on the SAME instance (same refs); without
  // resetting this on setup, the cleanup's `= true` sticks and makes every later
  // play() bail before decoding — that was the "no audio" regression. On a real
  // unmount, `= true` still blocks a late-resolving callback. The *shared* audio
  // context is intentionally left open for the next screen.
  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      stop();
    };
  }, [stop]);

  return { isPlaying, mouthOpen, play, replay, stop };
}
