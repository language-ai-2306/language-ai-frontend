/**
 * HomeScreen — "Learning Quest" hub shown after login + the quick check.
 *
 * Matches the product mockup: a purple stage with a speech bubble, the 3D
 * companion in a white card ("Ollie Lingo"), three difficulty quests
 * (Easy unlocked, Medium/Hard locked until previous quests are done), and the
 * Explore Doctors / Retake the test actions.
 *
 * The 3D character is reused here (idle) so it preloads — the practice screen
 * then opens instantly — and the app feels like one character throughout. The
 * owl in the mockup is a placeholder; the real 3D avatar stays for now.
 */
import { Suspense } from 'react';
import { Lock, Play, Stethoscope, User } from 'lucide-react';

import { useApp } from '../store/AppStore';
import { AvatarStage } from './components/AvatarStage';
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
        <div className="lq-bubble">
          <span className="lq-bubble__text">🎉 Let&apos;s practice together!</span>
        </div>

        <section className="lq-avatar-card">
          <div className="lq-avatar-card__stage">
            <Suspense fallback={<div className="lq-avatar-load" aria-hidden="true" />}>
              <AvatarStage state="idle" mouthOpen={0} micActive={false} getLevel={() => 0} />
            </Suspense>
          </div>
          <span className="lq-avatar-card__name">Ollie Lingo</span>
        </section>

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
                {quest.unlocked ? <Play size={22} fill="currentColor" /> : <Lock size={20} />}
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
            className="lq-pill"
            onClick={() => window.alert('Explore Doctors — coming soon')}
          >
            <Stethoscope size={18} aria-hidden="true" />
            Explore Doctors
          </button>
          <button
            type="button"
            className="lq-pill lq-pill--accent"
            onClick={() => {
              clearAssessment();
              navigate('assessment');
            }}
          >
            Retake the test
          </button>
        </div>
      </main>
    </div>
  );
}
