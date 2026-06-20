/** Shared types mirroring the backend API contract (see backend/app/schemas.py). */

export type Mood = 'neutral' | 'happy' | 'excited' | 'thinking' | 'sad';

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  reply: string;
  mood: Mood;
  word_count: number;
}

/** High-level avatar animation state, independent of mood. */
export type AvatarState = 'idle' | 'listening' | 'thinking' | 'talking';
