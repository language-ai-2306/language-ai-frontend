/**
 * HomeScreen — "Learning Quest" hub shown after login + the quick check.
 *
 * Layout (redesign): a full-bleed illustrated room with the 3D companion and a
 * left-side speech bubble forms the hero; a white rounded sheet slides up over
 * it holding the "Choose your quest level" picker (Easy unlocked; Medium/Hard
 * locked until previous quests are done) and the Explore Doctors / Retake rows.
 *
 * The 3D character is reused here (idle) so it preloads — the practice screen
 * then opens instantly — and the app feels like one character throughout.
 */
import { Suspense } from 'react';
import { ChevronRight, Lock, RefreshCw, Sparkles, Star, Stethoscope, User } from 'lucide-react';

import { useApp } from '../store/AppStore';
import { AvatarStage } from './components/AvatarStage';
import { RoomBackground } from './components/RoomBackground';
import './home.css';

interface Quest {
  key: string;
  title: string;
  tagline: string;
  /** Easy is the entry point; Medium/Hard unlock as quests are completed. */
  unlocked: boolean;
  /** Difficulty colour modifier (lq-quest--easy / --medium / --hard). */
  variant: string;
}

const QUESTS: Quest[] = [
  { key: 'easy', title: 'Easy', tagline: 'Start here!', unlocked: true, variant: 'lq-quest--easy' },
  {
    key: 'medium',
    title: 'Medium',
    tagline: 'Complete previous quests',
    unlocked: false,
    variant: 'lq-quest--medium',
  },
  {
    key: 'hard',
    title: 'Hard',
    tagline: 'Complete previous quests',
    unlocked: false,
    variant: 'lq-quest--hard',
  },
];

export function HomeScreen(): JSX.Element {
  const { navigate, clearAssessment } = useApp();

  return (
    <div className="lq-screen">
      <header className="lq-topbar">
        <div className="lq-brand">
          <span className="lq-brand__badge" aria-hidden="true">
            🦉
          </span>
          <span className="lq-brand__title">Learning Quest</span>
        </div>
        <button
          type="button"
          className="lq-profile"
          onClick={() => navigate('login')}
          aria-label="Log out"
          title="Log out"
        >
          <User size={20} aria-hidden="true" />
        </button>
      </header>

      <main className="lq-main">
        {/* Hero — room scene + companion, with the speech bubble on the left. */}
        <section className="lq-hero">
          <RoomBackground />
          <div className="lq-hero__stage">
            <Suspense fallback={<div className="lq-avatar-load" aria-hidden="true" />}>
              <AvatarStage state="idle" mouthOpen={0} micActive={false} getLevel={() => 0} />
            </Suspense>
          </div>
          <div className="lq-bubble">
            <span className="lq-bubble__text">
              Hi there! I&apos;m <b>Ollie</b>. Let&apos;s learn together!
            </span>
          </div>
        </section>

        {/* Sheet — quest picker + actions, slides up over the hero. */}
        <section className="lq-sheet">
          <h2 className="lq-sheet__heading">
            <Sparkles className="lq-sheet__spark" size={18} aria-hidden="true" />
            Choose your quest level
            <Sparkles className="lq-sheet__spark" size={18} aria-hidden="true" />
          </h2>

          <div className="lq-quests">
            {QUESTS.map((quest) => (
              <button
                key={quest.key}
                type="button"
                className={`lq-quest ${quest.variant}${quest.unlocked ? '' : ' lq-quest--locked'}`}
                onClick={() => quest.unlocked && navigate('companion')}
                disabled={!quest.unlocked}
              >
                <span className="lq-quest__icon" aria-hidden="true">
                  {quest.unlocked ? <Star size={24} fill="currentColor" /> : <Lock size={20} />}
                </span>
                <span className="lq-quest__text">
                  <span className="lq-quest__title">{quest.title}</span>
                  <span className="lq-quest__tagline">{quest.tagline}</span>
                </span>
                {quest.unlocked && <span className="lq-quest__badge">Unlocked</span>}
              </button>
            ))}
          </div>

          <div className="lq-footer">
            <button
              type="button"
              className="lq-row"
              onClick={() => window.alert('Explore Doctors — coming soon')}
            >
              <Stethoscope className="lq-row__icon" size={20} aria-hidden="true" />
              <span className="lq-row__label">Explore Doctors</span>
              <ChevronRight className="lq-row__chevron" size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="lq-row"
              onClick={() => {
                clearAssessment();
                navigate('assessment');
              }}
            >
              <RefreshCw className="lq-row__icon" size={20} aria-hidden="true" />
              <span className="lq-row__label">Retake the test</span>
              <ChevronRight className="lq-row__chevron" size={20} aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
