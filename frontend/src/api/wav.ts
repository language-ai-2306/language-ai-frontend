/**
 * Convert a recorded audio Blob (MediaRecorder gives webm/opus on Chrome, mp4 on
 * Safari) into a 16 kHz mono 16-bit PCM WAV — a format the Python backend reads
 * directly via SoundFile, with no ffmpeg dependency.
 *
 * Decoding uses the browser's own codecs (it can always decode what it recorded),
 * and OfflineAudioContext resamples to the target rate.
 */
type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
  webkitOfflineAudioContext?: typeof OfflineAudioContext;
};

const TARGET_RATE = 16000;

export async function blobToWav(blob: Blob, targetRate = TARGET_RATE): Promise<Blob> {
  const Ctx = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  const Offline = window.OfflineAudioContext ?? (window as WebkitWindow).webkitOfflineAudioContext;
  if (!Ctx || !Offline) return blob; // no Web Audio → send as-is

  const arrayBuf = await blob.arrayBuffer();
  const ctx = new Ctx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(arrayBuf);
  } finally {
    void ctx.close();
  }

  // Resample to mono @ targetRate.
  const length = Math.max(1, Math.ceil(decoded.duration * targetRate));
  const offline = new Offline(1, length, targetRate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();

  return encodeWav(rendered.getChannelData(0), targetRate);
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string): void => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM header size
  view.setUint16(20, 1, true); // format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate (rate * blockAlign)
  view.setUint16(32, 2, true); // block align (channels * bytesPerSample)
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([view], { type: 'audio/wav' });
}
