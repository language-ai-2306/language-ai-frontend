/**
 * BackSwipeHint — an animated back-arrow affordance on the left edge of a screen.
 *
 * The arrow nudges leftwards on a loop and a label reads "Swipe left to go back",
 * teaching the gesture handled by `useSwipeBack`. It's also a real button: tapping
 * it calls `onBack`, so the control works without discovering the swipe. Pass the
 * live swipe `progress` (0→1) to make the arrow lean into the drag as it happens.
 */
import { ArrowLeft } from 'lucide-react';

import './backswipe.css';

interface BackSwipeHintProps {
  onBack: () => void;
  /** Live drag progress (0→1) from useSwipeBack — leans the arrow into the swipe. */
  progress?: number;
  label?: string;
}

export function BackSwipeHint({
  onBack,
  progress = 0,
  label = 'Swipe left to go back',
}: BackSwipeHintProps): JSX.Element {
  return (
    <button
      type="button"
      className={`lq-backswipe${progress > 0.02 ? ' lq-backswipe--active' : ''}`}
      style={{ '--lq-back-progress': progress } as React.CSSProperties}
      onClick={onBack}
      aria-label="Go back"
    >
      <span className="lq-backswipe__arrow" aria-hidden="true">
        <ArrowLeft size={22} strokeWidth={3} />
      </span>
      <span className="lq-backswipe__hint">{label}</span>
    </button>
  );
}
