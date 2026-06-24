/**
 * MicrophoneButton — the dominant control. One tap starts recording, another
 * tap stops it (no press-and-hold). Shows a calm listening treatment while
 * recording and a gentle spinner while processing. Never uses alarming red.
 */
import { Mic, Square } from 'lucide-react';

export type MicVisualState = 'ready' | 'listening' | 'processing';

export interface MicrophoneButtonProps {
  state: MicVisualState;
  onClick: () => void;
  disabled?: boolean;
}

const LABELS: Record<MicVisualState, string> = {
  ready: 'Start recording',
  listening: 'Stop recording',
  processing: 'Thinking about your attempt',
};

export function MicrophoneButton({ state, onClick, disabled = false }: MicrophoneButtonProps): JSX.Element {
  return (
    <div className="mic">
      <button
        type="button"
        className={`mic__button mic__button--${state}`}
        onClick={onClick}
        disabled={disabled || state === 'processing'}
        aria-label={LABELS[state]}
        aria-pressed={state === 'listening'}
      >
        {state === 'listening' && <span className="mic__ring" aria-hidden="true" />}
        {state === 'processing' ? (
          <span className="mic__spinner" aria-hidden="true" />
        ) : state === 'listening' ? (
          <Square size={24} aria-hidden="true" fill="currentColor" />
        ) : (
          <Mic size={28} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
