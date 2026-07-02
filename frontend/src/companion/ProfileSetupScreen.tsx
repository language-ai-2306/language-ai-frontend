/**
 * ProfileSetupScreen — the patient's first-run onboarding, shown right after
 * their first login / email verification. Collects a nickname, a mascot avatar,
 * and whether they're seeing a therapist (which picks the home dashboard
 * variant), then hands off to the dashboard.
 *
 * Avatars are emoji placeholders for now (same convention as QuickStartScreen);
 * swap `emoji` for real artwork once the brand assets ship.
 */
import { useState } from 'react';
import { ArrowRight, Rabbit } from 'lucide-react';

import { useApp } from '../store/AppStore';
import './profilesetup.css';

interface Avatar {
  id: string;
  emoji: string;
  label: string;
}

/** The 10 selectable mascots, in mockup order. */
const AVATARS: Avatar[] = [
  { id: 'lion', emoji: '🦁', label: 'Lion' },
  { id: 'elephant', emoji: '🐘', label: 'Elephant' },
  { id: 'monkey', emoji: '🐵', label: 'Monkey' },
  { id: 'panda', emoji: '🐼', label: 'Panda' },
  { id: 'penguin', emoji: '🐧', label: 'Penguin' },
  { id: 'frog', emoji: '🐸', label: 'Frog' },
  { id: 'owl', emoji: '🦉', label: 'Owl' },
  { id: 'fox', emoji: '🦊', label: 'Fox' },
  { id: 'turtle', emoji: '🐢', label: 'Turtle' },
  { id: 'parrot', emoji: '🦜', label: 'Parrot' },
];

export function ProfileSetupScreen(): JSX.Element {
  const { state, navigate, completeProfile } = useApp();
  const [nickname, setNickname] = useState(state.name);
  const [avatar, setAvatar] = useState(state.avatar || 'lion');
  const [seeingTherapist, setSeeingTherapist] = useState<boolean | null>(null);

  const submit = (): void => {
    completeProfile({
      name: nickname.trim(),
      avatar,
      hasDoctor: seeingTherapist ?? false,
    });
    navigate('home');
  };

  return (
    <div className="ps-screen">
      <div className="ps-brand">
        <Rabbit size={26} strokeWidth={2.4} aria-hidden="true" />
        <span>LanguageAI</span>
      </div>

      <div className="ps-card">
        <h1 className="ps-title">Let&apos;s Get Started!</h1>
        <p className="ps-sub">Set up your profile to start playing.</p>

        {/* ---- 1. Basic Personalization ---- */}
        <section className="ps-section">
          <h2 className="ps-heading">1. Basic Personalization</h2>

          <label className="ps-field">
            <span>What should we call you?</span>
            <input
              className="ps-input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Type your nickname here!"
              maxLength={24}
              autoComplete="nickname"
            />
          </label>

          <div className="ps-field">
            <span className="ps-field__label">Choose an Avatar</span>
            <div className="ps-avatars" role="radiogroup" aria-label="Choose an avatar">
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={avatar === a.id}
                  aria-label={a.label}
                  className={`ps-avatar ${avatar === a.id ? 'is-selected' : ''}`}
                  onClick={() => setAvatar(a.id)}
                >
                  <span aria-hidden="true">{a.emoji}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <hr className="ps-divider" />

        {/* ---- 2. Therapist Connection ---- */}
        <section className="ps-section">
          <h2 className="ps-heading">2. Therapist Connection</h2>
          <p className="ps-question">Are you currently seeing a therapist?</p>
          <div className="ps-choice">
            <button
              type="button"
              className={`ps-choice__btn ${seeingTherapist === true ? 'is-active' : ''}`}
              aria-pressed={seeingTherapist === true}
              onClick={() => setSeeingTherapist(true)}
            >
              Yes
            </button>
            <button
              type="button"
              className={`ps-choice__btn ${seeingTherapist === false ? 'is-active' : ''}`}
              aria-pressed={seeingTherapist === false}
              onClick={() => setSeeingTherapist(false)}
            >
              No
            </button>
          </div>
        </section>

        <hr className="ps-divider" />

        <button type="button" className="ps-cta" onClick={submit}>
          Continue to Dashboard <ArrowRight size={22} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
