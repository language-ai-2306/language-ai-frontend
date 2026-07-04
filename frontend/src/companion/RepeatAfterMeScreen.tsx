/**
 * RepeatAfterMeScreen — difficulty picker shown when the child taps "Repeat
 * After Me" on Home, before the game itself.
 *
 * Reuses the Home hero (the companion standing in the room) with a "Let's play"
 * bubble. Each unlocked level launches the shared game (CompanionScreen) in
 * `repeat` mode tagged with its difficulty, so the game can fetch a
 * difficulty-specific question set from the API later.
 */
import { Suspense } from 'react';
import { Play, Speech, User, type LucideIcon } from 'lucide-react';

import { EXERCISE_LABELS, useApp, type GameDifficulty } from '../store/AppStore';
import { AvatarStage } from './components/AvatarStage';
import { BirdLoader } from './components/BirdLoader';
import { useSwipeBack } from './hooks/useSwipeBack';
import { HOME_CAMERA } from './three/avatarConfig';
import './home.css';

interface Level {
  key: GameDifficulty;
  title: string;
  tagline: string;
  unlocked: boolean;
  variant: string;
  Icon: LucideIcon;
}

const LEVELS: Level[] = [
  { key: 'easy', title: 'Easy', tagline: 'Start here!', unlocked: true, variant: 'lq-level--easy', Icon: Play },
  { key: 'medium', title: 'Medium', tagline: 'Step it up!', unlocked: true, variant: 'lq-level--medium', Icon: Play },
  { key: 'hard', title: 'Hard', tagline: 'Challenge time!', unlocked: true, variant: 'lq-level--hard', Icon: Play },
  { key: 'twister', title: 'Tongue Twister', tagline: 'Twist your tongue!', unlocked: true, variant: 'lq-level--twister', Icon: Speech },
];

export function RepeatAfterMeScreen(): JSX.Element {
  const { state, navigate, startGame } = useApp();
  const label = EXERCISE_LABELS[state.currentGame];
  // Story Teller has no Tongue Twister content — don't offer it there.
  const levels = LEVELS.filter(
    (l) => !(state.currentGame === 'STORY_TELLER' && l.key === 'twister'),
  );

  // Swipe left to return to the previous screen (Home).
  const goBack = (): void => navigate('home');
  const { handlers, dragX, dragging } = useSwipeBack(goBack);

  return (
    <div
      className="lq-screen lq-screen--repeat"
      {...handlers}
      style={{
        transform: dragX ? `translateX(${dragX}px)` : undefined,
        transition: dragging ? 'none' : 'transform 0.25s ease',
      }}
    >
      <header className="lq-topbar">
        <div className="lq-brand">
          <span className="lq-brand__badge" aria-hidden="true">
            🦉
          </span>
          <span className="lq-brand__title">LanguageAI</span>
        </div>
        <button
          type="button"
          className="lq-profile"
          onClick={() => navigate('home')}
          aria-label="Back to home"
          title="Home"
        >
          <User size={20} aria-hidden="true" />
        </button>
      </header>

      <main className="lq-main">
        {/* Hero — same companion + room as Home, with a "Let's play" bubble. */}
        <section className="lq-hero">
          <div className="lq-bubble">
            <span className="lq-bubble__text">🎉 Let&apos;s play &quot;{label}&quot;</span>
          </div>
          <div className="lq-hero__stage">
            <Suspense fallback={<BirdLoader />}>
              <AvatarStage
                state="idle"
                mouthOpen={0}
                micActive={false}
                getLevel={() => 0}
                camera={HOME_CAMERA}
              />
            </Suspense>
          </div>
        </section>

        {/* Difficulty picker — each unlocked level launches the game in repeat
            mode with its difficulty (drives the question set the game fetches). */}
        <section className="lq-picker">
          <div className="lq-levels">
            {levels.map(({ key, title, tagline, unlocked, variant, Icon }) => (
              <button
                key={key}
                type="button"
                className={`lq-level ${variant}${unlocked ? '' : ' lq-level--locked'}`}
                onClick={() => unlocked && startGame('repeat', key)}
                disabled={!unlocked}
              >
                <span className="lq-level__icon" aria-hidden="true">
                  <Icon size={24} />
                </span>
                <span className="lq-level__text">
                  <span className="lq-level__title">{title}</span>
                  {tagline && <span className="lq-level__tagline">{tagline}</span>}
                </span>
                {unlocked && <span className="lq-level__badge">Unlocked</span>}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
