/**
 * SpeedControl — two dock buttons (slower / faster) that nudge the phrase
 * playback speed by ±0.05 around "normal" (1.0×), with a live readout between
 * them. Slowing down helps users hear each sound clearly for articulation; the
 * value is clamped to MIN_RATE..MAX_RATE by the parent.
 */
import { Rabbit, Turtle } from 'lucide-react';

export interface SpeedControlProps {
  rate: number;
  onSlower: () => void;
  onFaster: () => void;
  /** Disabled at the slow limit (can't go slower). */
  slowerDisabled?: boolean;
  /** Disabled at the fast limit (can't go faster). */
  fasterDisabled?: boolean;
  /** Stack the buttons vertically (slower on top, faster on bottom). */
  vertical?: boolean;
}

export function SpeedControl({
  rate,
  onSlower,
  onFaster,
  slowerDisabled = false,
  fasterDisabled = false,
  vertical = false,
}: SpeedControlProps): JSX.Element {
  return (
    <div
      className={`speed-control${vertical ? ' speed-control--vertical' : ''}`}
      role="group"
      aria-label="Playback speed"
    >
      <button
        type="button"
        className="speed-button"
        onClick={onSlower}
        disabled={slowerDisabled}
        aria-label="Slow the voice down"
      >
        <Turtle size={24} aria-hidden="true" />
      </button>
      <span className="speed-control__value" aria-live="polite">
        {rate.toFixed(2)}×
      </span>
      <button
        type="button"
        className="speed-button"
        onClick={onFaster}
        disabled={fasterDisabled}
        aria-label="Speed the voice up"
      >
        <Rabbit size={24} aria-hidden="true" />
      </button>
    </div>
  );
}
