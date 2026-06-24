/**
 * FeedbackPanel — shown after an attempt. Presents the encouraging message and
 * a single clear next action: "Next phrase" on success, "Try again" on retry.
 * Tone is always supportive; there is no pass/fail and no score shown here.
 */
import { ArrowRight, RotateCcw } from 'lucide-react';

import type { FeedbackResult } from '../types';

export interface FeedbackPanelProps {
  feedback: FeedbackResult;
  onNext: () => void;
  onRetry: () => void;
}

export function FeedbackPanel({ feedback, onNext, onRetry }: FeedbackPanelProps): JSX.Element {
  const isSuccess = feedback.tone === 'success';

  return (
    <section className={`feedback-panel feedback-panel--${feedback.tone}`} role="status" aria-live="polite">
      <p className="feedback-panel__message">{feedback.message}</p>
      {feedback.tip && <p className="feedback-panel__tip">{feedback.tip}</p>}

      {isSuccess ? (
        <button type="button" className="cta cta--primary" onClick={onNext}>
          <span>Next phrase</span>
          <ArrowRight size={20} aria-hidden="true" />
        </button>
      ) : (
        <button type="button" className="cta cta--primary" onClick={onRetry}>
          <RotateCcw size={20} aria-hidden="true" />
          <span>Try again</span>
        </button>
      )}
    </section>
  );
}
