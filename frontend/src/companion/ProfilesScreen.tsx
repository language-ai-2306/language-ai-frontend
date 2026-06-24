/**
 * ProfilesScreen — "Who's practicing?" The child picks their avatar (no
 * password) to enter the app. Shown after the grown-up has signed in.
 *
 * First pass: one default child (uses the stored name, or "Sam") plus an
 * "Add a child" placeholder and a gated "Grown-ups" entry. Wire to a real
 * child list once onboarding exists.
 */
import { useApp } from '../store/AppStore';
import './auth.css';

export function ProfilesScreen(): JSX.Element {
  const { state, navigate } = useApp();
  const childName = state.name.trim() || 'Sam';

  return (
    <div className="auth-screen profiles">
      <h1 className="profiles__title">Who's practicing?</h1>

      <div className="profiles__grid">
        <button type="button" className="profile-card" onClick={() => navigate('home')}>
          <span className="profile-card__avatar" aria-hidden="true">
            🦊
          </span>
          <span className="profile-card__name">{childName}</span>
        </button>

        <button
          type="button"
          className="profile-card profile-card--add"
          onClick={() => window.alert('Add a child — coming soon')}
        >
          <span className="profile-card__avatar" aria-hidden="true">
            ＋
          </span>
          <span className="profile-card__name">Add a child</span>
        </button>
      </div>

      <button
        type="button"
        className="profiles__grownups"
        onClick={() => window.alert('Grown-up area (parent & therapist) — coming soon')}
      >
        🔒 Grown-ups
      </button>
    </div>
  );
}
