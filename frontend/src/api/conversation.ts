/** Talk-with-Ollie conversation endpoints (/v1/conversation). */
import { request } from './client';
import { blobToWav } from './wav';

export interface StartSessionResponse {
  session_id: string;
  turn_number: number; // always 1 (Ollie's opening turn)
  text: string; // Ollie's greeting + first question
  audio: string; // base64 MP3 of the greeting
}

export interface DisfluencyEvent {
  type: string;
  word?: string | null;
  timestamp_start?: number | null;
  timestamp_end?: number | null;
  severity?: string | null;
}

export interface TurnResponse {
  turn_id: string;
  session_id: string;
  turn_number: number;
  child_transcript: string;
  child_audio_url: string;
  text: string; // Ollie's reply
  audio: string; // base64 MP3 of the reply
  disfluency_count: number;
  disfluencies: DisfluencyEvent[];
}

/** POST /v1/conversation/session/start — Ollie greets first. */
export function startConversation(): Promise<StartSessionResponse> {
  return request<StartSessionResponse>('/v1/conversation/session/start', { method: 'POST' });
}

/** POST /v1/conversation/session/{id}/reply — upload the child's audio, get Ollie's reply.
 *  The recording is converted to 16 kHz mono WAV first so the backend reads it
 *  without needing ffmpeg (raw webm/opus fails SoundFile). */
export async function submitReply(sessionId: string, audio: Blob): Promise<TurnResponse> {
  let file = audio;
  let filename = 'reply.wav';
  try {
    file = await blobToWav(audio);
  } catch {
    // Conversion failed → send the original and let the backend try.
    filename = filenameFor(audio);
  }
  const form = new FormData();
  form.append('audio', file, filename);
  return request<TurnResponse>(`/v1/conversation/session/${sessionId}/reply`, {
    method: 'POST',
    body: form,
  });
}

/** POST /v1/conversation/session/{id}/end — end the session (best-effort). */
export function endConversation(sessionId: string): Promise<unknown> {
  return request<unknown>(`/v1/conversation/session/${sessionId}/end`, { method: 'POST' });
}

/** Pick a sensible filename/extension from the recorded blob's MIME type. */
function filenameFor(blob: Blob): string {
  const t = blob.type;
  if (t.includes('webm')) return 'reply.webm';
  if (t.includes('mp4') || t.includes('m4a')) return 'reply.m4a';
  if (t.includes('ogg')) return 'reply.ogg';
  if (t.includes('wav')) return 'reply.wav';
  return 'reply.webm';
}
