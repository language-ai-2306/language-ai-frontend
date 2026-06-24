/**
 * AudioUploadSocket — streams recorded microphone audio to the backend over a
 * single WebSocket connection and resolves with the analysis feedback.
 *
 * Why WebSocket (and not a POST): the MediaRecorder emits a chunk every ~250ms,
 * and we forward each one immediately over an already-open connection — so the
 * bytes travel *while the user is still speaking*. When they stop, only the
 * final tail remains, so the upload completes almost instantly. The same
 * persistent channel then carries progress (`status`) and the final `feedback`
 * back, with no second round-trip.
 *
 * Protocol mirrors backend/app/routers/attempts.py:
 *   → {type:"start", exercise, target, mime}   (control, text)
 *   → <binary audio chunk>                      (repeated)
 *   → {type:"end", durationMs}                  (control, text)
 *   ← {type:"status", status}                   (0..N progress pings)
 *   ← {type:"feedback", ...AttemptFeedback} | {type:"error", detail}
 */
import type { AttemptFeedback } from '../types';

export interface AttemptMeta {
  exercise: string;
  target?: string;
  /** Container mime type of the audio, e.g. "audio/webm". */
  mime?: string;
}

/** Build the ws(s):// URL for an /api path, honoring an explicit API base. */
function wsUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (base) {
    return base.replace(/^http/, 'ws').replace(/\/+$/, '') + path;
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}${path}`;
}

export class AudioUploadSocket {
  private readonly ws: WebSocket;
  private readonly onStatus?: (status: string) => void;
  private meta: AttemptMeta | null = null;
  /** Audio chunks recorded before the socket opened / before begin() was called. */
  private readonly pending: Blob[] = [];
  private startSent = false;
  private settled = false;

  private resolveFb?: (fb: AttemptFeedback) => void;
  private rejectFb?: (err: Error) => void;
  /** Captured if the socket fails before finish() is awaited. */
  private earlyError: Error | null = null;

  constructor(onStatus?: (status: string) => void) {
    this.onStatus = onStatus;
    this.ws = new WebSocket(wsUrl('/api/attempts/ws'));
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => this.flush();

    this.ws.onmessage = (ev) => {
      let msg: Partial<AttemptFeedback> & { type?: string; detail?: string; status?: string };
      try {
        msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
      } catch {
        return;
      }
      if (msg.type === 'feedback') {
        this.resolve(msg as AttemptFeedback);
      } else if (msg.type === 'status') {
        this.onStatus?.(msg.status ?? '');
      } else if (msg.type === 'error') {
        this.reject(new Error(msg.detail ?? 'Upload rejected'));
      }
    };

    this.ws.onerror = () => this.reject(new Error('Audio upload connection error'));
    this.ws.onclose = () => this.reject(new Error('Audio upload closed before feedback'));
  }

  /** Declare the attempt. Safe to call before or after the socket opens. */
  begin(meta: AttemptMeta): void {
    this.meta = meta;
    this.flush();
  }

  /** Queue/stream one chunk. Buffered until the socket is open and begin() ran. */
  sendChunk(chunk: Blob): void {
    this.pending.push(chunk);
    this.flush();
  }

  /** Signal end-of-stream; resolves with the analysis feedback (or rejects). */
  finish(durationMs: number): Promise<AttemptFeedback> {
    return new Promise<AttemptFeedback>((resolve, reject) => {
      if (this.settled) {
        reject(this.earlyError ?? new Error('Upload already finished'));
        return;
      }
      this.resolveFb = resolve;
      this.rejectFb = reject;
      if (this.earlyError) {
        this.reject(this.earlyError);
        return;
      }
      const sendEnd = () => {
        if (!this.settled && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'end', durationMs }));
        }
      };
      this.flush(); // ensure start + buffered chunks go out first
      if (this.ws.readyState === WebSocket.OPEN) sendEnd();
      else this.ws.addEventListener('open', sendEnd, { once: true });
    });
  }

  /** Abort without waiting for feedback (e.g. recording failed to start). */
  abort(): void {
    this.settled = true;
    try {
      this.ws.close();
    } catch {
      /* noop */
    }
  }

  /** Send the start frame (once) followed by every buffered chunk, in order. */
  private flush(): void {
    if (this.ws.readyState !== WebSocket.OPEN || this.meta === null) return;
    if (!this.startSent) {
      this.ws.send(
        JSON.stringify({
          type: 'start',
          exercise: this.meta.exercise,
          target: this.meta.target ?? null,
          mime: this.meta.mime ?? 'audio/webm',
        }),
      );
      this.startSent = true;
    }
    while (this.pending.length > 0) {
      this.ws.send(this.pending.shift() as Blob);
    }
  }

  private resolve(fb: AttemptFeedback): void {
    if (this.settled) return;
    this.settled = true;
    this.resolveFb?.(fb);
    try {
      this.ws.close();
    } catch {
      /* noop */
    }
  }

  private reject(err: Error): void {
    if (this.settled) return;
    if (!this.rejectFb) {
      // finish() not awaited yet — remember it so finish() can reject promptly.
      this.earlyError = err;
      return;
    }
    this.settled = true;
    this.rejectFb(err);
  }
}

/**
 * One-shot convenience: upload an already-finished recording over a WebSocket
 * and resolve with its feedback. Used when there's no live stream (the whole
 * blob is sent as a single chunk). Live recording should prefer streaming
 * chunks via {@link AudioUploadSocket}.
 */
export async function submitAttempt(
  audio: Blob,
  meta: { exercise: string; target?: string; durationMs: number },
): Promise<AttemptFeedback> {
  const socket = new AudioUploadSocket();
  socket.begin({ exercise: meta.exercise, target: meta.target, mime: audio.type || 'audio/webm' });
  socket.sendChunk(audio);
  return socket.finish(meta.durationMs);
}
