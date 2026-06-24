/** SkipButton — circular control that skips to the next phrase. */
import { SkipForward } from 'lucide-react';

export interface SkipButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function SkipButton({ onClick, disabled = false }: SkipButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className="skip-button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Skip to the next phrase"
    >
      <SkipForward size={24} aria-hidden="true" />
    </button>
  );
}
