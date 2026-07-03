/** Auth endpoints (real backend). */
import { request } from './client';
import { clearToken, setToken } from './token';
import type { SignupPayload, Token, UserRead } from '../types/api';

/** Map the UI's gender label to the backend's single-char code ('M'|'F'|'O'). */
export function toGenderCode(label: string): string {
  const l = (label || '').toLowerCase();
  if (l.startsWith('f')) return 'F';
  if (l.startsWith('m')) return 'M';
  return 'O';
}

/** POST /auth/signup — create a patient or doctor account. Returns the new user. */
export function signup(payload: SignupPayload): Promise<UserRead> {
  return request<UserRead>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * POST /auth/login — OAuth2 password flow (form-encoded; `username` = email).
 * Persists the returned token, then resolves the current user via /auth/me.
 */
export async function login(email: string, password: string): Promise<UserRead> {
  const body = new URLSearchParams({ username: email, password, grant_type: 'password' });
  const token = await request<Token>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  setToken(token.access_token);
  return me();
}

/** GET /auth/me — the currently authenticated user (uses the stored token). */
export function me(): Promise<UserRead> {
  return request<UserRead>('/auth/me');
}

/** Drop the stored token (client-side logout). */
export function logout(): void {
  clearToken();
}
