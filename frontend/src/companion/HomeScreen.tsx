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
import { Suspense } from 'react';
import { Palette, PawPrint, User } from 'lucide-react';

import { useApp } from '../store/AppStore';
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
  const { state, navigate, startGame } = useApp();
  const firstName = state.name.trim() || 'friend';

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

          <h2 className="lq-journey__heading">Continue Journey</h2>
          <div className="lq-journey">
            <button
              type="button"
              className="lq-action lq-action--green"
              onClick={() => startGame('converse')}
            >
              <span className="lq-action__icon" aria-hidden="true">
                <PawPrint size={26} />
              </span>
              <span className="lq-action__label">Talk with Ollie</span>
            </button>
            <button
              type="button"
              className="lq-action lq-action--blue"
              onClick={() => navigate('repeatSelect')}
            >
              <span className="lq-action__icon" aria-hidden="true">
                <Palette size={26} />
              </span>
              <span className="lq-action__label">Repeat After Me</span>
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
