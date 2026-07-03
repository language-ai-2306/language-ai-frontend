/**
 * HomeScreen — "Learning Quest" landing hub, shown after login + the quick check.
 *
 * Two variants, keyed on `state.hasDoctor` (from the login API in future):
 *   • With a doctor    → daily + weekly mission cards, then Continue Journey.
 *   • Without a doctor  → Continue Journey + an "Explore Therapists" CTA.
 *
 * Layout: the 3D companion stands in its own white hero (disconnected from the
 * menu), with a lavender content sheet below holding the missions/actions. The
 * character is reused (idle) so it preloads and the practice screens open fast.
 */
import { Suspense, useEffect, useState } from 'react';
import { BookOpen, Image, Palette, PawPrint, ScrollText, Star, User } from 'lucide-react';

import { getDashboard, type DashboardItem } from '../api/dashboard';
import {
  EXERCISE_LABELS,
  useApp,
  type ExerciseKind,
  type GameMode,
} from '../store/AppStore';
import { AvatarStage } from './components/AvatarStage';
import { BirdLoader } from './components/BirdLoader';
import { HOME_CAMERA } from './three/avatarConfig';
import './home.css';

/** A circular progress ring with a `value / total` label in its centre. */
function MissionRing({ value, total }: { value: number; total: number }): JSX.Element {
  const R = 34;
  const C = 2 * Math.PI * R;
  const frac = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <div className="lq-ring">
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle className="lq-ring__track" cx="40" cy="40" r={R} />
        <circle
          className="lq-ring__fill"
          cx="40"
          cy="40"
          r={R}
          strokeDasharray={`${C * frac} ${C}`}
          transform="rotate(-90 40 40)"
        />
      </svg>
      <span className="lq-ring__label">
        <b>{value}</b>/{total}
      </span>
    </div>
  );
}

interface Mission {
  label: string;
  value: number;
  total: number;
  caption: string;
  /** Carousel dots — presentational until missions come from the API. */
  dots: number;
}

function MissionCard({ label, value, total, caption, dots }: Mission): JSX.Element {
  return (
    <article className="lq-mission">
      <h3 className="lq-mission__label">{label}</h3>
      <MissionRing value={value} total={total} />
      <p className="lq-mission__caption">{caption}</p>
      <span className="lq-dots" aria-hidden="true">
        {Array.from({ length: dots }).map((_, i) => (
          <i key={i} className={i === 0 ? 'is-active' : ''} />
        ))}
      </span>
    </article>
  );
}

export function HomeScreen(): JSX.Element {
  const { state, navigate, startGame, setCurrentGame } = useApp();
  const firstName = state.name.trim() || 'friend';

  // Repeat After Me / Read It Loud / Story Teller share the difficulty picker;
  // set which game is active first, then open it.
  const openPicker = (game: 'REPEAT_AFTER_ME' | 'READ_IT_LOUD' | 'STORY_TELLER'): void => {
    setCurrentGame(game);
    navigate('repeatSelect');
  };

  // Today's assigned plan tasks (from the SLP's plan).
  const [today, setToday] = useState<DashboardItem[]>([]);
  useEffect(() => {
    let alive = true;
    getDashboard()
      .then((d) => {
        if (alive) setToday(d.today);
      })
      .catch(() => undefined); // no plan / not a patient → just hide the section
    return () => {
      alive = false;
    };
  }, []);

  // Launch a planned exercise: the plan supplies difficulty/phoneme, so it skips
  // the picker and runs with plan_item_id (session + /end on close).
  const launchPlanned = (item: DashboardItem): void => {
    const game = item.exercise_type as ExerciseKind;
    const mode: GameMode = game === 'TALK_WITH_OLLIE' || game === 'PICTURE_TALK' ? 'converse' : 'repeat';
    startGame(mode, null, game, item.item_id);
  };

  return (
    <div className="lq-screen">
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
          onClick={() => navigate('login')}
          aria-label="Log out"
          title="Log out"
        >
          <User size={20} aria-hidden="true" />
        </button>
      </header>

      <main className="lq-main">
        {/* Hero — the companion stands on a white background, separate from the
            menu below (per the reference layout). */}
        <section className="lq-hero">
          <div className="lq-bubble">
            <span className="lq-bubble__text">Hi {firstName}!</span>
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

        {/* Content sheet — missions (doctor users only) + Continue Journey. */}
        <section className="lq-content">
          {state.hasDoctor && (
            <div className="lq-missions">
              <MissionCard
                label="Today's Mission"
                value={0}
                total={1}
                caption="Ready to start?"
                dots={2}
              />
              <MissionCard
                label="Weekly Mission"
                value={2}
                total={5}
                caption="Keep it up!"
                dots={4}
              />
            </div>
          )}

          {today.length > 0 && (
            <>
              <h2 className="lq-journey__heading">Today&apos;s Practice</h2>
              <div className="lq-journey">
                {today.map((item) => (
                  <button
                    key={item.item_id}
                    type="button"
                    className="lq-action lq-action--gold"
                    onClick={() => launchPlanned(item)}
                  >
                    <span className="lq-action__icon" aria-hidden="true">
                      <Star size={26} />
                    </span>
                    <span className="lq-action__label">
                      {EXERCISE_LABELS[item.exercise_type as ExerciseKind] ?? item.exercise_type}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          <h2 className="lq-journey__heading">Continue Journey</h2>
          <div className="lq-journey">
            <button
              type="button"
              className="lq-action lq-action--green"
              onClick={() => startGame('converse', null, 'TALK_WITH_OLLIE')}
            >
              <span className="lq-action__icon" aria-hidden="true">
                <PawPrint size={26} />
              </span>
              <span className="lq-action__label">Talk with Ollie</span>
            </button>
            <button
              type="button"
              className="lq-action lq-action--blue"
              onClick={() => openPicker('REPEAT_AFTER_ME')}
            >
              <span className="lq-action__icon" aria-hidden="true">
                <Palette size={26} />
              </span>
              <span className="lq-action__label">Repeat After Me</span>
            </button>
            <button
              type="button"
              className="lq-action lq-action--orange"
              onClick={() => openPicker('READ_IT_LOUD')}
            >
              <span className="lq-action__icon" aria-hidden="true">
                <BookOpen size={26} />
              </span>
              <span className="lq-action__label">Read It Loud</span>
            </button>
            <button
              type="button"
              className="lq-action lq-action--pink"
              onClick={() => startGame('converse', null, 'PICTURE_TALK')}
            >
              <span className="lq-action__icon" aria-hidden="true">
                <Image size={26} />
              </span>
              <span className="lq-action__label">Picture Talk</span>
            </button>
            <button
              type="button"
              className="lq-action lq-action--violet"
              onClick={() => openPicker('STORY_TELLER')}
            >
              <span className="lq-action__icon" aria-hidden="true">
                <ScrollText size={26} />
              </span>
              <span className="lq-action__label">Story Teller</span>
            </button>
          </div>

          {!state.hasDoctor && (
            <button
              type="button"
              className="lq-therapists"
              onClick={() => window.alert('Explore Therapists — coming soon')}
            >
              Explore Therapists
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
