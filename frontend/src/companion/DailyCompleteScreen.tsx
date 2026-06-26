/**
 * DailyCompleteScreen — shown once the day's goal (DAILY_GOAL_LEVELS practice
 * levels) is met. Celebrates by name and offers to keep going or stop for now.
 *
 * The Ollie logo here is a placeholder (emoji owl) until the brand art lands —
 * the same owl stands in for the mascot across the app for now.
 */
import { Gamepad2 } from 'lucide-react';

import { useApp } from '../store/AppStore';
import { Confetti } from './components/Confetti';
import './dailycomplete.css';

export function DailyCompleteScreen(): JSX.Element {
  const { state, navigate } = useApp();
  const name = state.name.trim() || 'friend';

  return (
    <div className="dm-screen">
      <Confetti />

      <div className="dm-content">
        <div className="dm-logo">
          <span className="dm-logo__tabs dm-logo__tabs--l" aria-hidden="true" />
          <span className="dm-logo__tabs dm-logo__tabs--r" aria-hidden="true" />
          <span className="dm-logo__owl" aria-hidden="true">
            🦉
          </span>
          <span className="dm-logo__brand">Ollie</span>
          <span className="dm-logo__sub">Language App</span>
        </div>

        <h1 className="dm-title">Amazing job, {name}! 🌟</h1>
        <p className="dm-sub">
          You completed today&apos;s goal
          <br />
          your brain is on fire today!
        </p>

        <button type="button" className="dm-btn dm-btn--go" onClick={() => navigate('companion')}>
          Keep Going <Gamepad2 size={20} aria-hidden="true" />
        </button>
        <button type="button" className="dm-btn dm-btn--later" onClick={() => navigate('home')}>
          Maybe Later
        </button>
      </div>
    </div>
  );
}
