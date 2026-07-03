/**
 * CompanionScreen — full-screen 3D speech-practice experience.
 *
 * Layout (rebuilt): an illustrated room fills the entire screen, a 3D character
 * occupies ~80% of it, and exactly three controls float on top — the phrase
 * text, a replay ("hear it again") button, and the microphone button. One tap
 * records, another stops; the avatar reacts and gives gentle, auto-advancing
 * feedback. Analysis is mocked; mic + replay are real, behind typed hooks.
 */
import { Suspense, useCallback, useMemo, useRef, useState } from 'react';

import { useSpeech } from '../hooks/useSpeech';
import { useApp } from '../store/AppStore';
import { AvatarStage } from './components/AvatarStage';
import { BackButton } from './components/BackButton';
import { BirdLoader } from './components/BirdLoader';
import { MicrophoneButton, type MicVisualState } from './components/MicrophoneButton';
import { ReplayButton } from './components/ReplayButton';
import { SkipButton } from './components/SkipButton';
import { SpeedControl } from './components/SpeedControl';
import { useMicrophoneRecorder } from './hooks/useMicrophoneRecorder';
import { usePracticeSession } from './hooks/usePracticeSession';
import { useLipSync, type MouthShape } from './lipsync/useLipSync';
import './companion.css';

const NO_MIC_LISTEN_MS = 1500;

// Playback speed: "normal" is 1.0×, adjustable in 0.05 steps. Slower playback
// helps users hear each sound clearly; clamped to a sensible, still-natural range.
const RATE_STEP = 0.05;
const MIN_RATE = 0.5;
const MAX_RATE = 1.5;
const clampRate = (r: number): number =>
  Math.round(Math.min(MAX_RATE, Math.max(MIN_RATE, r)) * 100) / 100;

/** How far the fox's "mouth"/head opens per viseme (drives the 3D head chatter). */
const SHAPE_OPEN: Record<MouthShape, number> = {
  X: 0,
  A: 0.04,
  B: 0.22,
  C: 0.5,
  D: 0.9,
  E: 0.6,
  F: 0.28,
  G: 0.2,
  H: 0.5,
};

/** Shown over the room until the 3D character (chunk + model) is fully ready. */
function CompanionLoading(): JSX.Element {
  return (
    <div className="companion__loading">
      <BirdLoader label="Getting your buddy ready…" />
    </div>
  );
}

export function CompanionScreen(): JSX.Element {
  const { state, navigate, completeLevel } = useApp();
  // Which experience launched this game: 'converse' (Talk with Ollie) or
  // 'repeat' (Repeat After Me). Both run on this one screen; the mode tweaks the
  // UI copy and — in future — which backend APIs the practice session calls.
  const mode = state.gameMode;
  // Prompt label per game (falls back to the mode default).
  const PROMPT_EYEBROW: Record<string, string> = {
    REPEAT_AFTER_ME: 'Repeat after me',
    READ_IT_LOUD: 'Read this out loud',
    STORY_TELLER: 'Tell the story',
    PICTURE_TALK: 'Tell me about this',
    TALK_WITH_OLLIE: 'Say this',
  };
  const promptEyebrow = PROMPT_EYEBROW[state.currentGame] ?? (mode === 'repeat' ? 'Repeat after me' : 'Say this');
  // Indirection so the level-complete handler can use hooks declared below.
  const completeRef = useRef<() => void>(() => {});
  const session = usePracticeSession({ onLevelComplete: () => completeRef.current() });
  const recorder = useMicrophoneRecorder();
  const speech = useSpeech();
  // Playback speed the user sets with the slower/faster dock buttons (1.0 = normal).
  const [rate, setRate] = useState(1);
  const lip = useLipSync(session.phrase, rate);

  const { phase, phrase, feedback } = session;

  // "Talking" can come from the pre-rendered lip-sync audio (preferred, real
  // visemes) or the browser TTS fallback.
  const speaking = lip.isPlaying || speech.isSpeaking;
  const avatarState = speaking ? 'speaking' : session.avatarState;
  // The avatar's mouth is driven by the real viseme during lip-sync (precise
  // per-sound shapes); TTS has no visemes, so it falls back to raw amplitude.
  const viseme = lip.isPlaying ? lip.mouthShape : 'X';
  const mouthOpen = lip.isPlaying
    ? SHAPE_OPEN[lip.mouthShape]
    : speech.isSpeaking
      ? speech.mouthOpen
      : 0;

  const handleMic = useCallback(async () => {
    if (phase === 'ready') {
      speech.cancel();
      lip.stop();
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
  }, [phase, recorder, session, speech, lip]);

  const handleReplay = useCallback(() => {
    // Prefer the pre-rendered audio + viseme mouth chart; fall back to TTS.
    if (lip.available) {
      speech.cancel();
      lip.play();
    } else if (speech.supported) {
      speech.speak(phrase, { rate });
    }
  }, [lip, speech, phrase, rate]);

  // Slow down / speed up the voice by one step (±0.05), clamped to the range.
  const handleSlower = useCallback(() => setRate((r) => clampRate(r - RATE_STEP)), []);
  const handleFaster = useCallback(() => setRate((r) => clampRate(r + RATE_STEP)), []);

  // Skip the current phrase and move to the next one.
  const handleSkip = useCallback(() => {
    speech.cancel();
    lip.stop();
    session.next();
  }, [speech, lip, session]);

  // Back to the home hub.
  const handleBack = useCallback(() => {
    speech.cancel();
    lip.stop();
    void recorder.stop();
    navigate('home');
  }, [speech, lip, recorder, navigate]);

  // Finish the level: bank the reward, then show the celebration screen.
  const handleLevelComplete = useCallback(() => {
    speech.cancel();
    lip.stop();
    void recorder.stop();
    completeLevel();
    navigate('dailyComplete');
  }, [speech, lip, recorder, completeLevel, navigate]);
  completeRef.current = handleLevelComplete;

  // Split the phrase into words with their char offsets, then find the word
  // being spoken right now (read-along highlight) — from the lip-sync progress
  // when that's playing, otherwise from the TTS word-boundary index.
  const words = useMemo(() => {
    const out: { text: string; start: number }[] = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(phrase)) !== null) out.push({ text: m[0], start: m.index });
    return out;
  }, [phrase]);
  const wordCursor = lip.isPlaying
    ? lip.progress * phrase.length
    : speech.isSpeaking
      ? speech.charIndex
      : -1;
  const activeWord =
    wordCursor < 0 ? -1 : words.reduce((acc, w, i) => (wordCursor >= w.start ? i : acc), -1);

  const replayDisabled =
    (!lip.available && !speech.supported) || phase === 'listening' || phase === 'processing';

  const micState: MicVisualState =
    phase === 'listening' ? 'listening' : phase === 'processing' ? 'processing' : 'ready';
  const micBusy = phase === 'processing' || phase === 'success' || phase === 'retry';
  const statusToneClass = feedback ? ` overlay-phrase__status--${feedback.tone}` : '';

  return (
    <div className="companion companion--immersive">
      {/* Layer 0 — room photo (same image as the Home hero) fills the whole
          screen, for a consistent room across Home and the game. */}
      <div className="companion__room" aria-hidden="true" />

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
            viseme={viseme}
            emotion={lip.emotion}
          />
        </div>

        {/* Overlay element 1 — the phrase text (with status/feedback subline) */}
        <div className="overlay-phrase">
          <span className="overlay-phrase__eyebrow">{promptEyebrow}</span>
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

        {/* Speed control — vertical pill, floating top-right beside the phrase */}
        <div className="overlay-speed">
          <SpeedControl
            vertical
            rate={rate}
            onSlower={handleSlower}
            onFaster={handleFaster}
            slowerDisabled={rate <= MIN_RATE}
            fasterDisabled={rate >= MAX_RATE}
          />
        </div>

        {/* Dock — back, replay, microphone, skip (one horizontal row) */}
        <div className="overlay-dock">
          <BackButton onClick={handleBack} />
          <ReplayButton onClick={handleReplay} disabled={replayDisabled} playing={speaking} />
          <MicrophoneButton state={micState} onClick={handleMic} disabled={speaking || micBusy} />
          <SkipButton onClick={handleSkip} disabled={phase === 'listening' || phase === 'processing'} />
        </div>
      </Suspense>
    </div>
  );
}
