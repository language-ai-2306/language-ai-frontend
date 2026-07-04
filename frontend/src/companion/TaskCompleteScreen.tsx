/**
 * TaskCompleteScreen — the shared celebration shown after finishing any practice
 * task (the timed exercise games). One reusable screen: confetti, a big smiley,
 * a "Congratulations" banner, then Continue playing (start another round) or
 * Exit (back to the dashboard).
 */
import { House, Play } from 'lucide-react';

import { useApp } from '../store/AppStore';
import { Confetti } from './components/Confetti';
import './taskcomplete.css';

export function TaskCompleteScreen(): JSX.Element {
  const { navigate } = useApp();

  return (
    <div className="tc-screen">
      <Confetti />

      <div className="tc-content">
        <h1 className="tc-title">CONGRATULATIONS!</h1>

        <div className="tc-face" aria-hidden="true">
          <span className="tc-face__emoji">😊</span>
        </div>

        <p className="tc-sub">You have completed the task!</p>

        <button type="button" className="tc-btn tc-btn--go" onClick={() => navigate('companion')}>
          Continue playing <Play size={20} fill="currentColor" aria-hidden="true" />
        </button>
        <button type="button" className="tc-btn tc-btn--exit" onClick={() => navigate('home')}>
          Exit <House size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
