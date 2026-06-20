/** MicButton — large, friendly record button used by the practice exercises. */
import { memo } from 'react';
import './MicButton.css';

export interface MicButtonProps {
  recording: boolean;
  onClick: () => void;
  disabled?: boolean;
  idleLabel?: string;
  activeLabel?: string;
}

function Icon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
      />
      <path
        fill="currentColor"
        d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08A7 7 0 0 0 19 11Z"
      />
    </svg>
  );
}

function MicButtonComponent({
  recording,
  onClick,
  disabled = false,
  idleLabel = 'Tap & speak',
  activeLabel = 'Tap when done',
}: MicButtonProps): JSX.Element {
  return (
    <div className="micbtn-wrap">
      <button
        type="button"
        className={`micbtn${recording ? ' micbtn--recording' : ''}`}
        onClick={onClick}
        disabled={disabled}
        aria-pressed={recording}
        aria-label={recording ? activeLabel : idleLabel}
      >
        <Icon />
      </button>
      <span className="micbtn-label">{recording ? activeLabel : idleLabel}</span>
    </div>
  );
}

export const MicButton = memo(MicButtonComponent);
