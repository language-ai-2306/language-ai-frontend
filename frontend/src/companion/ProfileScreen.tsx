/**
 * ProfileScreen — the account hub reached from the top-bar profile icon. Offers
 * Personal Details (→ edit account), My Therapist (→ view/browse therapists), and
 * Log Out.
 */
import { ArrowLeft, ChevronRight, IdCard, LogOut, Stethoscope } from 'lucide-react';

import { useApp } from '../store/AppStore';
import { AvatarImage } from './components/AvatarImage';
import './profile.css';

export function ProfileScreen(): JSX.Element {
  const { state, navigate, logout, setTherapistView } = useApp();

  return (
    <div className="prof-screen">
      <header className="prof-topbar">
        <button className="prof-back" onClick={() => navigate('home')} aria-label="Back to home">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="prof-title">Profile</h1>
      </header>

      <main className="prof-main">
        <div className="prof-hero">
          <AvatarImage url={state.avatarUrl} size={110} />
          <h2 className="prof-hero__name">{state.name || 'Your profile'}</h2>
        </div>

        <button type="button" className="prof-item" onClick={() => navigate('account')}>
          <span className="prof-item__icon prof-item__icon--blue" aria-hidden="true">
            <IdCard size={22} />
          </span>
          <span className="prof-item__label">Personal Details</span>
          <ChevronRight size={20} aria-hidden="true" />
        </button>

        <button
          type="button"
          className="prof-item"
          onClick={() => {
            setTherapistView('mine');
            navigate('explore');
          }}
        >
          <span className="prof-item__icon prof-item__icon--pink" aria-hidden="true">
            <Stethoscope size={22} />
          </span>
          <span className="prof-item__label">My Therapist</span>
          <ChevronRight size={20} aria-hidden="true" />
        </button>

        <button type="button" className="prof-logout" onClick={logout}>
          <LogOut size={20} aria-hidden="true" /> Log Out
        </button>
      </main>
    </div>
  );
}
