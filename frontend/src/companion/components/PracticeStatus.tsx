/**
 * PracticeStatus — the supportive status line. Politely announced to screen
 * readers via aria-live so state changes are perceivable without animation.
 */
export function PracticeStatus({ message }: { message: string }): JSX.Element {
  return (
    <p className="practice-status" role="status" aria-live="polite">
      {message}
    </p>
  );
}
