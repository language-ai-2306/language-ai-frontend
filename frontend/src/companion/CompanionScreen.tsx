/**
 * CompanionScreen — full-screen 3D speech-practice experience.
 *
 * Layout (rebuilt): an illustrated room fills the entire screen, a 3D character
 * occupies ~80% of it, and exactly three controls float on top — the phrase
 * text, a replay ("hear it again") button, and the microphone button. One tap
 * records, another stops; the avatar reacts and gives gentle, auto-advancing
 * feedback. Analysis is mocked; mic + replay are real, behind typed hooks.
 */
import { Suspense, useCallback, useMemo } from 'react';

import { useSpeech } from '../hooks/useSpeech';
import { AvatarStage } from './components/AvatarStage';
import { MicrophoneButton, type MicVisualState } from './components/MicrophoneButton';
import { ReplayButton } from './components/ReplayButton';
import { RoomBackground } from './components/RoomBackground';
import { useMicrophoneRecorder } from './hooks/useMicrophoneRecorder';
import { usePracticeSession } from './hooks/usePracticeSession';
import './companion.css';

const NO_MIC_LISTEN_MS = 1500;

/** Shown over the room until the 3D character (chunk + model) is fully ready. */
function CompanionLoading(): JSX.Element {
  return (
    <div className="companion__loading" role="status" aria-live="polite">
      <span className="companion__loading-spinner" aria-hidden="true" />
      <p className="companion__loading-text">Getting your buddy ready…</p>
    </div>
  );
}

export function CompanionScreen(): JSX.Element {
  const session = usePracticeSession();
  const recorder = useMicrophoneRecorder();
  const speech = useSpeech();

  const { phase, phrase, feedback } = session;

  // Mascot state: replay (speaking) overrides the phase-derived state.
  const avatarState = speech.isSpeaking ? 'speaking' : session.avatarState;
  const mouthOpen = speech.isSpeaking ? speech.mouthOpen : 0;

  const handleMic = useCallback(async () => {
    if (phase === 'ready') {
      speech.cancel();
      if (recorder.supported) {
        const ok = await recorder.start();
        if (ok) session.beginListening();
      } else {
        // No microphone — run a gentle simulated attempt so it's never blocked.
        session.beginListening();
        window.setTimeout(() => session.endListening(), NO_MIC_LISTEN_MS);
      }
    } else if (phase === 'listening') {
      // Advance the UI immediately so the mic disables at once (no double-tap,
      // no waiting on the recorder), then stop capture in the background.
      session.endListening();
      if (recorder.supported) void recorder.stop();
    }
  }, [phase, recorder, session, speech]);

  const handleReplay = useCallback(() => {
    if (!speech.supported) return;
    // A touch slow so the child can follow the highlighted word as it's spoken.
    speech.speak(phrase, { rate: 0.85 });
  }, [speech, phrase]);

  // Split the phrase into words with their char offsets, and find the one being
  // spoken right now (read-along highlight). charIndex is the start of the
  // current word, so the active word is the last one starting at/<= charIndex.
  const words = useMemo(() => {
    const out: { text: string; start: number }[] = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(phrase)) !== null) out.push({ text: m[0], start: m.index });
    return out;
  }, [phrase]);
  const activeWord = speech.isSpeaking
    ? words.reduce((acc, w, i) => (speech.charIndex >= w.start ? i : acc), -1)
    : -1;

  const micState: MicVisualState =
    phase === 'listening' ? 'listening' : phase === 'processing' ? 'processing' : 'ready';
  const micBusy = phase === 'processing' || phase === 'success' || phase === 'retry';
  const statusToneClass = feedback ? ` overlay-phrase__status--${feedback.tone}` : '';

  return (
    <div className="companion companion--immersive">
      {/* Layer 0 — room fills the whole screen (shown during loading too) */}
      <RoomBackground />

      {/* Everything else waits behind one Suspense boundary, so the avatar and
          all controls appear together only once the 3D model is ready — no
          SVG-then-fox flash. */}
      <Suspense fallback={<CompanionLoading />}>
        {/* Layer 1 — 3D avatar (~80% of the screen) */}
        <div className="companion__avatar">
          <AvatarStage
            state={avatarState}
            mouthOpen={mouthOpen}
            micActive={recorder.isRecording}
            getLevel={recorder.getLevel}
          />
        </div>

        {/* Overlay element 1 — the phrase text (with status/feedback subline) */}
        <div className="overlay-phrase">
          <span className="overlay-phrase__eyebrow">Say this</span>
          <p className="overlay-phrase__text">
            {words.map((w, i) => (
              <span
                key={`${w.start}-${i}`}
                className={`overlay-phrase__word${i === activeWord ? ' overlay-phrase__word--active' : ''}`}
              >
                {w.text}
                {i < words.length - 1 ? ' ' : ''}
              </span>
            ))}
          </p>
          <p className={`overlay-phrase__status${statusToneClass}`} role="status" aria-live="polite">
            {recorder.error ?? session.statusMessage}
          </p>
        </div>

        {/* Overlay elements 2 & 3 — replay + microphone */}
        <div className="overlay-dock">
          <ReplayButton
            onClick={handleReplay}
            disabled={!speech.supported || phase === 'listening' || phase === 'processing'}
            playing={speech.isSpeaking}
          />
          <MicrophoneButton state={micState} onClick={handleMic} disabled={speech.isSpeaking || micBusy} />
        </div>
      </Suspense>
    </div>
  );
}
