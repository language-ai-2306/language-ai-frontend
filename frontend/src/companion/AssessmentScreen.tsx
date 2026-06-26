/**
 * AssessmentScreen — the 5-minute "quick check" the child takes after their
 * first login. It's the "say it back" exercise on a countdown: the avatar models
 * a phrase, the child repeats it (tap mic to record, tap to stop), and we count
 * how many phrases they complete. When the timer ends (or they tap Finish), the
 * count maps to a level + recommended daily-practice minutes, which are stored
 * and used to configure the other exercises.
 *
 * Scoring is by phrase count for now (no ML); the recordings are the seam where
 * the backend can later score fluency for a smarter level.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { useSpeech } from '../hooks/useSpeech';
import {
  dailyMinutesForLevel,
  levelFromPhraseCount,
  useApp,
  type AssessmentResult,
} from '../store/AppStore';
import { AvatarStage } from './components/AvatarStage';
import { MicrophoneButton, type MicVisualState } from './components/MicrophoneButton';
import { ReplayButton } from './components/ReplayButton';
import { RoomBackground } from './components/RoomBackground';
import { PHRASES } from './data';
import { useMicrophoneRecorder } from './hooks/useMicrophoneRecorder';
import './assessment.css';

const TOTAL_SECONDS = 5 * 60;

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function AssessmentScreen(): JSX.Element {
  const { navigate, completeAssessment } = useApp();
  const speech = useSpeech();
  const recorder = useMicrophoneRecorder();

  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<'running' | 'done'>('running');
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const phrase = PHRASES[count % PHRASES.length];
  // Guards against overlapping start/stop while a tap's async work is pending.
  const micBusy = useRef(false);

  // Model each phrase as it comes up ("say it back").
  useEffect(() => {
    if (phase !== 'running') return;
    speech.speak(phrase, { rate: 0.95 });
    // Only re-run when the phrase changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, phase]);

  const finish = useCallback(() => {
    setPhase((prev) => {
      if (prev === 'done') return prev;
      speech.cancel();
      void recorder.stop();
      const level = levelFromPhraseCount(count);
      const res: AssessmentResult = {
        level,
        dailyMinutes: dailyMinutesForLevel(level),
        phrasesCompleted: count,
        takenAt: new Date().toISOString(),
      };
      setResult(res);
      completeAssessment(res);
      return 'done';
    });
  }, [count, speech, recorder, completeAssessment]);

  // Countdown.
  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // End when time runs out.
  useEffect(() => {
    if (phase === 'running' && secondsLeft === 0) finish();
  }, [secondsLeft, phase, finish]);

  const handleMic = useCallback(async () => {
    if (micBusy.current) return;
    micBusy.current = true;
    try {
      if (recorder.isRecording) {
        await recorder.stop();
        setCount((c) => c + 1); // a completed phrase
      } else {
        speech.cancel();
        if (recorder.supported) {
          const ok = await recorder.start();
          if (!ok) setCount((c) => c + 1); // denied — don't block the exam
        } else {
          setCount((c) => c + 1); // no mic — count the attempt
        }
      }
    } finally {
      micBusy.current = false;
    }
  }, [recorder, speech]);

  const handleReplay = useCallback(() => {
    if (speech.supported) speech.speak(phrase, { rate: 0.95 });
  }, [speech, phrase]);

  const avatarState = speech.isSpeaking ? 'speaking' : recorder.isRecording ? 'listening' : 'idle';
  const mouthOpen = speech.isSpeaking ? speech.mouthOpen : 0;
  const micState: MicVisualState = recorder.isRecording ? 'listening' : 'ready';

  if (phase === 'done' && result) {
    return (
      <div className="assessment">
        <RoomBackground />
        <div className="assessment__result">
          <span className="assessment__result-emoji" aria-hidden="true">
            🎉
          </span>
          <h1 className="assessment__result-title">All done!</h1>
          <p className="assessment__result-sub">You said {result.phrasesCompleted} phrases.</p>
          <div className="assessment__result-stats">
            <div className="assessment__result-stat">
              <b>Level {result.level}</b>
              <span>your starting level</span>
            </div>
            <div className="assessment__result-stat">
              <b>{result.dailyMinutes} min</b>
              <span>practice a day</span>
            </div>
          </div>
          <button type="button" className="assessment__go" onClick={() => navigate('home')}>
            Let&apos;s go ▸
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="assessment">
      <RoomBackground />

      {/* Full-bleed avatar behind the UI — same framing as the practice screen. */}
      <div className="assessment__avatar">
        <Suspense fallback={<div className="assessment__avatar-load" aria-hidden="true" />}>
          <AvatarStage
            state={avatarState}
            mouthOpen={mouthOpen}
            micActive={recorder.isRecording}
            getLevel={recorder.getLevel}
          />
        </Suspense>
      </div>

      <div className="assessment__content">
        <header className="assessment__bar">
          <span className="assessment__title">Quick check 🌟</span>
          <span className="assessment__timer">{fmt(secondsLeft)}</span>
          <span className="assessment__count">{count} done</span>
        </header>

        <div className="assessment__spacer" aria-hidden="true" />

        <div className="assessment__phrase">
          <span className="assessment__phrase-eyebrow">Say this</span>
          <p className="assessment__phrase-text">{phrase}</p>
        </div>

        <div className="assessment__dock">
          <ReplayButton onClick={handleReplay} disabled={!speech.supported} playing={speech.isSpeaking} />
          <MicrophoneButton state={micState} onClick={handleMic} />
          <button type="button" className="assessment__finish" onClick={finish}>
            Finish
          </button>
        </div>
      </div>
    </div>
  );
}
