/** Unified single-shot exercise endpoints (/v1/exercises/{game}). */
import { request } from './client';
import { blobToWav } from './wav';

export type GameSlug = 'repeat-after-me' | 'read-it-loud' | 'picture-talk' | 'story-teller';
export type BackendDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'TONGUE_TWISTER';

export interface ExerciseIntro {
  exercise_type: string;
  text: string;
  audio?: string | null; // base64 MP3 of the intro
}

export type TechniqueTier = 'MEASURED' | 'COACHING' | 'PACER';

export interface TechniqueCatalogItem {
  technique: string;
  tier: TechniqueTier;
  display_name: string;
  cue: string;
  explanation: string;
}

export interface TechniqueIntro {
  technique: string;
  display_name: string;
  explanation: string;
  cue: string;
  demo_text: string;
  audio?: string | null; // base64 MP3 of Ollie explaining + demoing
  pacer?: Record<string, unknown> | null; // e.g. metronome bpm options (Syllable-Timed)
}

export interface ExerciseContent {
  exercise_type: string;
  content_id: string;
  text: string; // phrase / passage / story / picture-prompt
  image_url?: string | null; // Picture Talk only
  reason?: string | null; // why chosen (RAM personalisation)
  audio?: string | null; // base64 MP3 spoken prompt (RAM / story), if any
  technique?: string | null; // fluency technique to apply on this prompt
}

export interface ExerciseAttempt {
  attempt_id?: string | null;
  exercise_type: string;
  content_id?: string | null;
  transcript?: string | null;
  scores: Record<string, unknown>;
  disfluencies: unknown[];
  should_retry?: boolean | null;
  audio_url?: string | null; // S3 url of the child's recording
  feedback_audio?: string | null; // base64 "great try, moving on" clip
  technique?: string | null;
  technique_metric?: Record<string, unknown> | null; // MEASURED only; null for coaching/pacer
}

/** GET /techniques — the fluency-technique catalog (cue, explanation, tier). */
export function getTechniques(): Promise<{ techniques: TechniqueCatalogItem[] }> {
  return request<{ techniques: TechniqueCatalogItem[] }>(`/v1/exercises/techniques`);
}

/** GET /techniques/{t}/intro — Ollie's spoken explanation + demo of a technique. */
export function getTechniqueIntro(technique: string): Promise<TechniqueIntro> {
  return request<TechniqueIntro>(`/v1/exercises/techniques/${technique}/intro`);
}

/** GET /start — the AI's spoken intro. Pass planItemId for a planned exercise
 *  (opens today's session). */
export function startExercise(game: GameSlug, planItemId?: string): Promise<ExerciseIntro> {
  const q = planItemId ? `?plan_item_id=${planItemId}` : '';
  return request<ExerciseIntro>(`/v1/exercises/${game}/start${q}`);
}

/** POST /end — mark today's planned session COMPLETED (planned exercises only). */
export function endExercise(game: GameSlug, planItemId: string): Promise<unknown> {
  const form = new FormData();
  form.append('plan_item_id', planItemId);
  return request<unknown>(`/v1/exercises/${game}/end`, { method: 'POST', body: form });
}

/** GET /content — the next prompt. Free play passes `difficulty`; planned passes `planItemId`. */
export function getContent(
  game: GameSlug,
  opts: { difficulty?: BackendDifficulty; targetPhoneme?: string; planItemId?: string; technique?: string },
): Promise<ExerciseContent> {
  const p = new URLSearchParams();
  if (opts.planItemId) p.set('plan_item_id', opts.planItemId);
  if (opts.difficulty) p.set('difficulty', opts.difficulty);
  if (opts.targetPhoneme) p.set('target_phoneme', opts.targetPhoneme);
  if (opts.technique) p.set('technique', opts.technique);
  return request<ExerciseContent>(`/v1/exercises/${game}/content?${p.toString()}`);
}

/** POST /attempt — analyse a recording and score it (audio uploaded as WAV). */
export async function submitAttempt(
  game: GameSlug,
  opts: { contentId: string; audio: Blob; planItemId?: string; useMock?: boolean; attemptNumber?: number; technique?: string },
): Promise<ExerciseAttempt> {
  let file = opts.audio;
  let filename = 'attempt.wav';
  try {
    file = await blobToWav(opts.audio);
  } catch {
    filename = 'attempt.webm';
  }
  const form = new FormData();
  form.append('audio', file, filename);
  form.append('content_id', opts.contentId);
  if (opts.planItemId) form.append('plan_item_id', opts.planItemId);
  form.append('use_mock', String(opts.useMock ?? false));
  // 1-based attempt count for this phrase; the backend caps retries with it.
  form.append('attempt_number', String(opts.attemptNumber ?? 1));
  if (opts.technique) form.append('technique', opts.technique);
  return request<ExerciseAttempt>(`/v1/exercises/${game}/attempt`, { method: 'POST', body: form });
}
