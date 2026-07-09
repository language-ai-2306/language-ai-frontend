/**
 * QuickStartScreen — the friendly intro a child sees right after creating their
 * account, before the 5-minute "quick check" (AssessmentScreen). Ollie greets
 * them by name and invites them into a short challenge.
 *
 * "Let's Go!" hands off to the assessment, which starts the countdown.
 */
import { useApp } from '../store/AppStore';
import './quickstart.css';

export function QuickStartScreen(): JSX.Element {
  const { state, navigate } = useApp();
  const firstName = state.name.trim() || 'friend';

  return (
    <div className="qs-screen">
      <div className="qs-card">
        <div className="qs-bubble">
          Hey {firstName}! <span aria-hidden="true">👋</span>
        </div>

        <div className="qs-logo">
          <img
            src="/logo.png"
            alt="LanguageAI"
            style={{ width: 150, height: 'auto', display: 'block' }}
          />
        </div>

        <h1 className="qs-title">
          Let&apos;s see what you know!
          <span className="qs-title__star" aria-hidden="true">
            🌟
          </span>
        </h1>
        <p className="qs-sub">A quick challenge.</p>

        <button type="button" className="qs-cta" onClick={() => navigate('assessment')}>
          Let&apos;s Go! <span aria-hidden="true">🚀</span>
        </button>
      </div>
    </div>
  );
}
