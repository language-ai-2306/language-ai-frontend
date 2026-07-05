/**
 * Metronome — a steady visual + audio beat that helps the child produce even,
 * syllable-timed speech (Westmead). It's a pacing AID only; the backend scores
 * the actual timing regularity (CV-ISD) of the recording, not adherence to this
 * beat. Renders nothing when not running.
 */
import { useEffect, useRef, useState } from 'react';

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

export function Metronome({ bpm = 90, running }: { bpm?: number; running: boolean }): JSX.Element | null {
  const ctxRef = useRef<AudioContext | null>(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!running) return;
    const AC = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!ctxRef.current && AC) ctxRef.current = new AC();
    const ctx = ctxRef.current;
    void ctx?.resume();

    const click = (): void => {
      setPulse((p) => !p);
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 900;
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.07);
    };

    click();
    const id = window.setInterval(click, 60000 / bpm);
    return () => window.clearInterval(id);
  }, [running, bpm]);

  if (!running) return null;
  return (
    <div
      aria-hidden="true"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '4px 0' }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#2563eb',
          display: 'inline-block',
          transform: pulse ? 'scale(1.6)' : 'scale(1)',
          transition: 'transform 80ms ease-out',
        }}
      />
      <span style={{ fontSize: 13, color: '#475569' }}>Tap each beat 🥁</span>
    </div>
  );
}
