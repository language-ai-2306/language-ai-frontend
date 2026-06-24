/** ReplayButton — icon-only circular control that re-speaks the phrase. */
import { Volume2 } from 'lucide-react';

export interface ReplayButtonProps {
  onClick: () => void;
  disabled?: boolean;
  playing?: boolean;
}

export function ReplayButton({ onClick, disabled = false, playing = false }: ReplayButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className={`replay-button${playing ? ' replay-button--playing' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label="Hear the phrase again"
    >
      <Volume2 size={26} aria-hidden="true" />
    </button>
  );
}
