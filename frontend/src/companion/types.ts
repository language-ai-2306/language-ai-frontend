/** Shared types for the Companion practice experience. */

/** Public animation state for the mascot (AvatarStage's contract). */
export type AvatarState =
  | 'idle'
  | 'speaking'
  | 'listening'
  | 'thinking'
  | 'celebrating'
  | 'encouraging';

/** Explicit practice state machine. */
export type PracticePhase = 'ready' | 'listening' | 'processing' | 'success' | 'retry';

/** Mock analysis result — encouraging only, never punitive. */
export interface FeedbackResult {
  tone: 'success' | 'retry';
  message: string;
  tip?: string;
}
