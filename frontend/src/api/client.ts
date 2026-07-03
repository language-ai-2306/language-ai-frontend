/** Thin API client for the LanguageAI backend. */
import type { ChatRequest, ChatResponse } from '../types';
import { clearToken, getToken } from './token';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/** Dispatched on window when a request 401s (session expired / bad token). The
 *  store listens for this and routes back to login. */
export const UNAUTHORIZED_EVENT = 'languageai:unauthorized';

/** Max message length — mirrors the backend bound (defense in depth). */
export const MAX_MESSAGE_LENGTH = 500;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
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

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
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
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === 'string') detail = body.detail;
    } catch {
      /* non-JSON error body — keep the generic message */
    }
    throw new ApiError(detail, res.status);
  }

  // 204 No Content → nothing to parse.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function sendChat(message: string): Promise<ChatResponse> {
  const payload: ChatRequest = { message };
  return request<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Practice-attempt audio is uploaded over a WebSocket — see ./audioSocket.ts.
