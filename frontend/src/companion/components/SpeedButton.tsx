/**
 * SpeedButton — a circular "dial" that cycles the speech speed to slow it down
 * (1× → 0.75× → 0.5× → 1×). Sized to match the replay/mic buttons in the dock.
 */
export interface SpeedButtonProps {
  speed: number;
  onCycle: () => void;
}

function label(speed: number): string {
  return speed === 1 ? '1×' : `${speed}×`;
}

export function SpeedButton({ speed, onCycle }: SpeedButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className={`speed-button${speed < 1 ? ' speed-button--slow' : ''}`}
      onClick={onCycle}
      aria-label={`Speech speed ${label(speed)} — tap to slow down`}
    >
      <span className="speed-button__value">{label(speed)}</span>
    </button>
  );
}
