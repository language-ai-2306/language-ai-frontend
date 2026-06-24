/** Thin API client for the LanguageAI backend. */
import type { ChatRequest, ChatResponse } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
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
