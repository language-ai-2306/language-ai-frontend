/** Thin API client for the LanguageAI backend. */
import { clearToken, getToken } from './token';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/** True in local dev (Vite), false in production builds. Gates verbose,
 *  developer-facing error details so they never surface in the deployed app. */
export const IS_DEV = import.meta.env.DEV;

/** Abort a request that hangs longer than this, so a slow/stuck backend surfaces
 *  an error screen instead of an endless spinner. */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Dispatched on window when a request 401s (session expired / bad token). The
 *  store listens for this and routes back to login. */
export const UNAUTHORIZED_EVENT = 'languageai:unauthorized';

/** Fired on `window` when a practice game starts. Drives the mobile "your phone
 *  may be on silent" reminder toast. NB: the web can't read the hardware silent
 *  switch, so that toast is an honest reminder, not detection. */
export const GAME_STARTED_EVENT = 'languageai:game-started';

/** Max message length — mirrors the backend bound (defense in depth). */
export const MAX_MESSAGE_LENGTH = 500;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** Verbose diagnostics (method, URL, status, body). Populated in dev only and
     *  surfaced by dev-facing error UIs; undefined in production. */
    public readonly details?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The only endpoints that are callable without a bearer token. */
const PUBLIC_PATHS = [/^\/auth\/login/, /^\/auth\/signup/, /^\/health/];

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  // No token, authenticated endpoint → don't send the request at all. A screen
  // whose fetch chain outlives a 401 (its next call runs before React unmounts
  // it) would otherwise hit the API with no Authorization header. Fail here so
  // the app reports an expired session instead of a bare, confusing 401.
  if (!token && !PUBLIC_PATHS.some((p) => p.test(path))) {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(
      'Your session has expired. Please sign in again.',
      401,
      IS_DEV
        ? `${(init?.method ?? 'GET').toUpperCase()} ${BASE_URL}${path}\nnot sent: no bearer token`
        : undefined,
    );
  }
  // FormData must set its own multipart Content-Type (with boundary) — never JSON.
  const isForm = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  // Merge headers: default JSON (unless form), then caller overrides, then the auth
  // header (last so it always wins).
  const headers: Record<string, string> = {
    // Skip ngrok-free's browser-warning interstitial when the backend is tunnelled.
    'ngrok-skip-browser-warning': 'true',
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...(init?.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Abort the request if it takes too long so a slow/stuck backend surfaces an
  // error instead of hanging forever. A caller-supplied signal is honoured too.
  const method = (init?.method ?? 'GET').toUpperCase();
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  if (init?.signal) {
    if (init.signal.aborted) controller.abort();
    else init.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  // Dev-only diagnostics attached to thrown errors; undefined (stripped) in prod.
  const dev = (extra: string): string | undefined =>
    IS_DEV ? `${method} ${BASE_URL}${path}\n${extra}` : undefined;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers, signal: controller.signal });
  } catch (e) {
    if (timedOut) {
      throw new ApiError(
        'The server took too long to respond. Please try again.',
        0,
        dev(`request aborted after ${REQUEST_TIMEOUT_MS}ms (timeout)`),
      );
    }
    throw new ApiError(
      'Cannot reach the server. Is the backend running?',
      0,
      dev(`network error: ${e instanceof Error ? e.message : String(e)}`),
    );
  } finally {
    clearTimeout(timer);
  }

  // Expired / invalid token → drop it and let the app route to login. A 401 from
  // the login call itself just means wrong credentials, so don't treat it that way.
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    clearToken();
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (!res.ok) {
    // Try to surface FastAPI's error detail without leaking internals.
    let detail = `Request failed (${res.status})`;
    let bodyText = '';
    try {
      bodyText = await res.text();
      const body = JSON.parse(bodyText) as { detail?: unknown };
      if (typeof body.detail === 'string') detail = body.detail;
    } catch {
      /* non-JSON error body — keep the generic message */
    }
    throw new ApiError(detail, res.status, dev(`${res.status} ${res.statusText}\n${bodyText.slice(0, 800)}`));
  }

  // 204 No Content → nothing to parse.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Practice-attempt audio is uploaded over a WebSocket — see ./audioSocket.ts.
