/**
 * FeedbackCard — shows the backend's safe feedback for one attempt, and lets
 * the user retry or move on (workflow step 10).
 *
 * The child sees the sentence they repeated, an encouraging headline, a calm
 * smoothness meter, and gentle tips. The raw detected events + timestamps are
 * tucked into a "For grown-ups" disclosure so a parent or clinician can inspect
 * where issues occurred — without putting clinical labels in front of the child.
 */
import type { AttemptFeedback, EventType } from '../types';
import { Button } from './ui/ui';
import './FeedbackCard.css';

const EVENT_LABEL: Record<EventType, string> = {
  fluent: 'Smooth',
  repetition: 'Repetition',
  prolongation: 'Prolongation',
  block: 'Block',
  interjection: 'Interjection',
};

function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function FeedbackCard({
  feedback,
  target,
  onRetry,
  onNext,
}: {
  feedback: AttemptFeedback;
  /** The word/sentence the user was repeating. */
  target?: string;
  onRetry: () => void;
onNext: () => void;
}): JSX.Element {
  const { headline, detail, tips, smoothness, events } = feedback;

  return (
    <section className="feedback" aria-live="polite">
      {target && <p className="feedback__target">“{target}”</p>}

      <h2 className="feedback__headline">{headline}</h2>

      <div className="feedback__meter">
        <div className="feedback__meter-head">
          <span className="feedback__meter-label">Smoothness</span>
          <span className="feedback__meter-value">{smoothness}%</span>
        </div>
        <div className="feedback__meter-track">
          <span className="feedback__meter-fill" style={{ width: `${smoothness}%` }} />
        </div>
      </div>

      <p className="feedback__detail">{detail}</p>

      {tips.length > 0 && (
        <ul className="feedback__tips">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}

      {events.length > 0 && (
        <details className="feedback__grownup">
          <summary>For grown-ups · {events.length} events</summary>
          <ul className="feedback__events">
            {events.map((ev, i) => (
              <li key={`${ev.type}-${ev.start_ms}-${i}`}>
                <span className={`feedback__tag feedback__tag--${ev.type}`}>
                  {EVENT_LABEL[ev.type] ?? ev.type}
                </span>
                <span className="feedback__time">
                  {formatMs(ev.start_ms)}–{formatMs(ev.end_ms)}
                </span>
                <span className="feedback__conf">{Math.round(ev.confidence * 100)}%</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="feedback__actions">
        <Button variant="primary" size="md" onClick={onRetry}>
          Try again
        </Button>
        <Button variant="ghost" size="md" onClick={onNext}>
          Next ›
        </Button>
      </div>
    </section>
  );
}
