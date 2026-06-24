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

/** A speech event the detection model may emit (see backend EventType). */
export type EventType = 'fluent' | 'repetition' | 'prolongation' | 'block' | 'interjection';

/** One detected event and where it sits in the recording. */
export interface DetectedEvent {
  type: EventType;
  start_ms: number;
  end_ms: number;
  confidence: number;
}

/** Safe, encouraging feedback for one attempt (see backend AttemptFeedback). */
export interface AttemptFeedback {
  headline: string;
  detail: string;
  tips: string[];
  smoothness: number;
  duration_ms: number;
  events: DetectedEvent[];
}
