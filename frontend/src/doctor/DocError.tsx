/**
 * DocError — the doctor portal's shared error surface. Shows a friendly message
 * always, plus verbose response diagnostics in local dev only (never in the
 * deployed build), and an optional Retry.
 */
import { ApiError, IS_DEV } from '../api/client';

/** Friendly, user-facing message for any caught error. */
export function friendlyError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return 'Please sign in as a clinician to view this.';
    return e.message; // 0 = network/timeout (already friendly), else backend detail
  }
  return 'Something went wrong. Please try again.';
}

/** Verbose diagnostics for developers — returns null in production. */
export function errorDetails(e: unknown): string | null {
  if (!IS_DEV) return null;
  if (e instanceof ApiError) return e.details ?? `status ${e.status}`;
  if (e instanceof Error) return e.stack ?? e.message;
  return e != null ? String(e) : null;
}

export function DocError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}): JSX.Element {
  const details = errorDetails(error);
  return (
    <div className="doc-notice" role="alert">
      <p>{friendlyError(error)}</p>
      {details && <pre className="doc-notice__details">{details}</pre>}
      {onRetry && (
        <button type="button" className="doc-btn doc-btn--primary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
