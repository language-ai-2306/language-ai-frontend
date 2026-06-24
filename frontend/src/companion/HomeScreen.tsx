/**
 * HomeScreen — the child's hub. Greets them with the companion, shows today's
 * practice as a one-tap hero, a light progress strip, and the activity tiles.
 *
 * First pass of the MVP home: "Repeat after me" launches the practice screen
 * (companion); the other games are placeholders ("soon") until built. The 3D
 * fox is reused here (idle) so it preloads — the practice screen then opens
 * instantly — and the app feels like one character throughout.
 */
import { Suspense } from 'react';
import { LogOut } from 'lucide-react';

import { useApp, type Screen } from '../store/AppStore';
import { AvatarStage } from './components/AvatarStage';
import { RoomBackground } from './components/RoomBackground';
import './home.css';

interface Game {
  key: string;
  icon: string;
  title: string;
  tagline: string;
  /** CSS gradient for the card banner. */
  banner: string;
  screen?: Screen;
  ready: boolean;
}

const GAMES: Game[] = [
  {
    key: 'repeat',
    icon: '🗣️',
    title: 'Repeat after me',
    tagline: 'Say it back',
    banner: 'linear-gradient(135deg, #8b5cf6, #6867d8)',
    screen: 'companion',
    ready: true,
  },
  {
    key: 'read',
    icon: '📖',
    title: 'Read aloud',
    tagline: 'Read a sentence',
    banner: 'linear-gradient(135deg, #34d399, #16a34a)',
    ready: false,
  },
  {
    key: 'stretch',
    icon: '🫧',
    title: 'Stretchy sounds',
    tagline: 'Stretch the sounds',
    banner: 'linear-gradient(135deg, #38bdf8, #56c7b2)',
    ready: false,
  },
  {
    key: 'calm',
    icon: '🌬️',
    title: 'Breathe & relax',
    tagline: 'Calm breathing',
    banner: 'linear-gradient(135deg, #7dd3fc, #818cf8)',
    ready: false,
  },
];

export function HomeScreen(): JSX.Element {
  const { state, navigate, clearAssessment } = useApp();
  const name = state.name.trim() || 'friend';
  const { assessment } = state;

  return (
    <div className="home-screen">
      <RoomBackground />

      <div className="home2">
        <header className="home2__topbar">
          <span className="home2__hello">🦊 {name}</span>
          <div className="home2__topbar-actions">
            <button
              type="button"
              className="home2__grownups"
              onClick={() => window.alert('Grown-up area (parent & therapist) — coming soon')}
            >
              Grown-ups
            </button>
            <button
              type="button"
              className="home2__logout"
              onClick={() => navigate('login')}
              aria-label="Log out"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="home2__avatar">
          <Suspense fallback={<div className="home2__avatar-load" aria-hidden="true" />}>
            <AvatarStage state="idle" mouthOpen={0} micActive={false} getLevel={() => 0} />
          </Suspense>
        </div>
        <p className="home2__greeting">Hi {name}! Ready to play?</p>

        <button type="button" className="home2__plan" onClick={() => navigate('companion')}>
          <span className="home2__plan-eyebrow">⭐ Today's practice</span>
          <span className="home2__plan-title">
            {assessment
              ? `Level ${assessment.level} · ${assessment.dailyMinutes} min a day`
              : '3 fun activities'}
          </span>
          <span className="home2__plan-cta">Start ▸</span>
        </button>

        <div className="home2__games">
          {GAMES.map((g) => (
            <button
              key={g.key}
              type="button"
              className={`game-card${g.ready ? '' : ' game-card--soon'}`}
              disabled={!g.ready}
              onClick={() => {
                if (g.ready && g.screen) navigate(g.screen);
              }}
            >
              <div className="game-card__banner" style={{ background: g.banner }}>
                <span className="game-card__tagline">{g.tagline}</span>
                <span className="game-card__art" aria-hidden="true">
                  {g.icon}
                </span>
                {!g.ready && <span className="game-card__soon">Soon</span>}
              </div>
              <div className="game-card__footer">
                <span className="game-card__arrow" aria-hidden="true">
                  →
                </span>
                <span className="game-card__name">{g.title}</span>
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="home2__retake"
          onClick={() => {
            clearAssessment();
            navigate('assessment');
          }}
        >
          Retake quick check
        </button>
      </div>
    </div>
  );
}
