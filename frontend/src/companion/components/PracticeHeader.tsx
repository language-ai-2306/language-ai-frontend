/** PracticeHeader — exit control in the top safe area. */
import { X } from 'lucide-react';

export function PracticeHeader({ onExit }: { onExit: () => void }): JSX.Element {
  return (
    <header className="practice-header">
      <button type="button" className="icon-button" onClick={onExit} aria-label="Exit practice">
        <X size={24} aria-hidden="true" />
      </button>
    </header>
  );
}
