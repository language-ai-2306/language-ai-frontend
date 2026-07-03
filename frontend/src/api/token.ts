/**
 * Bearer-token persistence (localStorage) — the single source of truth for auth.
 * The API client reads this on every request; the store mirrors it for React.
 */
const TOKEN_KEY = 'languageai.token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // storage unavailable (private mode / SSR)
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
