/**
 * Client-side error logging.
 *
 * DEV  → readable, grouped console output (message + stack + component stack).
 * PROD → fire-and-forget POST of a structured report to the backend so real user
 *        crashes can be reviewed and replicated. Never throws: a broken logger
 *        must not itself crash the app.
 *
 * Wired from three capture points so nothing slips through:
 *   1. ErrorBoundary.componentDidCatch  → React render / lifecycle errors
 *   2. window 'error'                    → sync errors (incl. event handlers)
 *   3. window 'unhandledrejection'       → async / promise rejections
 *
 * The endpoint + release are env-configurable so this can point at your backend,
 * a serverless function, or a service like Sentry later without code changes.
 */

const ENDPOINT =
  (import.meta.env.VITE_ERROR_LOG_URL as string | undefined) ??
  `${(import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''}/v1/client-errors`;
const RELEASE = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev';

export interface ErrorContext {
  source?: 'react' | 'window' | 'promise' | 'manual';
  componentStack?: string | null;
  /** Anything extra worth correlating (screen name, user role, etc.). */
  extra?: Record<string, unknown>;
}

interface ErrorReport {
  message: string;
  stack: string | null;
  componentStack: string | null;
  source: string;
  url: string;
  userAgent: string;
  release: string;
  at: string;
  [key: string]: unknown;
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === 'string' ? value : JSON.stringify(value));
}

/** Log an error. Safe to call from anywhere; never throws. */
export function logClientError(value: unknown, ctx: ErrorContext = {}): void {
  const err = toError(value);
  const report: ErrorReport = {
    message: err.message,
    stack: err.stack ?? null,
    componentStack: ctx.componentStack ?? null,
    source: ctx.source ?? 'manual',
    url: typeof location !== 'undefined' ? location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    release: RELEASE,
    at: new Date().toISOString(),
    ...ctx.extra,
  };

  // ---- Dev: rich, human-readable console output; no network. ----
  if (import.meta.env.DEV) {
    console.groupCollapsed(
      `%c⚠ client-error [${report.source}] ${report.message}`,
      'color:#dc2626;font-weight:bold',
    );
    console.error(err);
    if (report.componentStack) console.error('Component stack:', report.componentStack);
    console.table({ source: report.source, url: report.url, release: report.release, at: report.at });
    console.groupEnd();
    return;
  }

  // ---- Prod: best-effort, non-blocking, unload-safe. Never throws. ----
  try {
    const body = JSON.stringify(report);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      // sendBeacon survives a page navigation/close (e.g. crash-then-reload).
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    } else {
      void fetch(ENDPOINT, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    /* logging must never break the app */
  }
}

/**
 * Register global handlers for errors a React boundary can't see:
 * synchronous errors in event handlers, and unhandled promise rejections.
 * Call once at startup (main.tsx).
 */
export function initGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => logClientError(e.error ?? e.message, { source: 'window' }));
  window.addEventListener('unhandledrejection', (e) => logClientError(e.reason, { source: 'promise' }));
}
