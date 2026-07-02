/**
 * OnboardingCompleteScreen — the therapist's "Registration Successful!"
 * confirmation, shown after they finish account setup. It points them to the
 * desktop portal for the real work (patient dashboard, medical records) and
 * ends the mobile onboarding.
 *
 * MVP: "Exit Application" just returns to the login screen (there's nothing to
 * exit to on the web); the back arrow returns to the setup form.
 */
import { ArrowLeft, Info } from 'lucide-react';

import { useApp } from '../store/AppStore';
import './therapistsetup.css';

export function OnboardingCompleteScreen(): JSX.Element {
  const { navigate } = useApp();

  return (
    <div className="ts-screen oc-screen">
      <header className="oc-head">
        <button
          type="button"
          className="oc-back"
          onClick={() => navigate('therapistSetup')}
          aria-label="Go back to account setup"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="oc-head__title">Onboarding Complete</h1>
      </header>

      <div className="oc-card">
        <h2 className="oc-title">Registration Successful!</h2>
        <p className="oc-body">
          You&apos;ve completed your account setup. Your professional profile is now active.
        </p>

        <div className="oc-note">
          <span className="oc-note__icon" aria-hidden="true">
            <Info size={16} />
          </span>
          <p>
            To manage your patient dashboard and view detailed medical records, please visit the
            LanguageAI portal on your desktop computer.
          </p>
        </div>

        <button type="button" className="ts-cta oc-cta" onClick={() => navigate('login')}>
          Exit Application
        </button>
      </div>
    </div>
  );
}
