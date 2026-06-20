/**
 * useSpeechRecognition — wraps the browser Web Speech API (SpeechRecognition)
 * for voice input. Click to talk: it transcribes one utterance, auto-stops on a
 * pause, and fires `onResult` with the final text.
 *
 * Browser support: Chrome, Edge, Safari (via `webkitSpeechRecognition`).
 * Requires HTTPS or localhost and a one-time microphone permission grant.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseSpeechRecognitionOptions {
  onResult: (text: string) => void;
  lang?: string;
}

export interface UseSpeechRecognition {
  supported: boolean;
  isListening: boolean;
  /** Live partial transcript while the user is speaking. */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition({
  onResult,
  lang = 'en-US',
}: UseSpeechRecognitionOptions): UseSpeechRecognition {
  const Ctor =
    typeof window !== 'undefined'
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;
  const supported = Boolean(Ctor);

  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Keep the latest callback without recreating the recognition object.
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const ensure = useCallback((): SpeechRecognition | null => {
    if (!Ctor) return null;
    if (recognitionRef.current) return recognitionRef.current;

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setError(null);
      setInterim('');
      setIsListening(true);
    };
    rec.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) finalText += text;
        else interimText += text;
      }
      if (interimText) setInterim(interimText);
      if (finalText.trim()) {
        setInterim('');
        onResultRef.current(finalText.trim());
      }
    };
    rec.onerror = (event) => {
      setIsListening(false);
      setInterim('');
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access was blocked. Allow it in your browser settings.');
      } else if (event.error === 'no-speech') {
        setError("I didn't catch that — tap the mic and try again.");
      } else if (event.error !== 'aborted') {
        setError('Speech recognition hiccuped. Please try again.');
      }
    };
    rec.onend = () => {
      setIsListening(false);
      setInterim('');
    };

    recognitionRef.current = rec;
    return rec;
  }, [Ctor, lang]);

  const start = useCallback(() => {
    const rec = ensure();
    if (!rec) return;
    setError(null);
    try {
      rec.start();
    } catch {
      /* start() throws if already running — ignore */
    }
  }, [ensure]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // Clean up on unmount.
  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported, isListening, interim, error, start, stop };
}
