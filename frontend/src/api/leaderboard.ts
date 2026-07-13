/**
 * Public school leaderboard (GET /v1/leaderboard).
 *
 * The only endpoint in the app that needs NO bearer token — the leaderboard page
 * is reachable without logging in. `client.ts` whitelists the path so the auth
 * guard lets it through (see PUBLIC_PATHS there).
 */
import { request } from './client';

export interface LeaderboardEntry {
  rank: number;
  /** Nickname, else first name. The API never returns a full name. */
  name: string;
  /** null = hasn't practised yet. NOT zero — render it as a dash, not a score. */
  fluency_score: number | null;
  /** How many scored attempts the average is over; 0 when they've never played. */
  attempts: number;
}

/** GET /v1/leaderboard — players ranked by fluency, highest first. */
export function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  return request<LeaderboardEntry[]>(`/v1/leaderboard?limit=${limit}`);
}
