/**
 * BackButton — the "X" control to go back to the previous page. Disabled for now
 * (the app currently has only this page); wire `onClick` once navigation exists.
 */
import { X } from 'lucide-react';

export interface BackButtonProps {
  onClick?: () => void;
  disabled?: boolean;
}

export function BackButton({ onClick, disabled = false }: BackButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className="back-button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Go back to the previous page"
    >
      <X size={24} aria-hidden="true" />
    </button>
  );
}
