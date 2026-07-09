/**
 * VerifyEmailScreen — the "pending" state shown right after sign-up. A
 * verification link has been emailed; the account stays locked until it's
 * clicked. For a minor patient the link goes to their guardian, so the copy
 * asks them to wait on the grown-up ("Waiting for Guardian Verification");
 * adults verify their own address.
 *
 * Auth is mocked, so there's no inbox to click: "Resend" just re-triggers the
 * (fake) send, and a temporary "I've verified — continue" link lets the demo
 * move on. Wire both to the real API and drop the continue link before launch.
 */
import { useState } from 'react';
import { ArrowLeft, Hourglass, Info, MailCheck } from 'lucide-react';

import { useApp } from '../store/AppStore';
import './signup.css';

export function VerifyEmailScreen(): JSX.Element {
  const { state, navigate, setPendingVerification } = useApp();
  const pending = state.pendingVerification;
  const isMinor = pending?.isMinor ?? false;
  const isTherapist = pending?.userType === 'therapist';
  const sentTo = (isMinor ? pending?.guardianEmail : pending?.email) || 'your inbox';
  const [resent, setResent] = useState(false);

  // Once the (guardian's) link is clicked the account is verified. A therapist
  // goes straight into professional account setup; a patient logs in — and on
  // that first login runs profile setup before reaching the home dashboard.
  const proceed = (): void => {
    if (isTherapist) {
      navigate('therapistSetup');
      return;
    }
    setPendingVerification(null);
    navigate('login');
  };

  return (
    <div className="su-screen su-screen--verify">
      <div className="su-verify">
        <header className="su-head su-head--brand">
          <button type="button" className="su-back" onClick={() => navigate('signup')} aria-label="Go back">
            <ArrowLeft size={22} aria-hidden="true" />
          </button>
          <span className="su-wordmark">LanguageAI</span>
        </header>

        <div className="su-verify__hero">
          <div className="su-verify__ring" aria-hidden="true">
            <div className="su-verify__avatar" style={{ overflow: 'hidden' }}>
              <img
                src="/logo.png"
                alt="LanguageAI"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          </div>
          <span className="su-badge">
            <Hourglass size={15} aria-hidden="true" /> Pending
          </span>
        </div>

        <section className="su-verify__card">
          <span className="su-verify__bar" aria-hidden="true" />
          <h1 className="su-verify__title">
            {isMinor ? 'Waiting for Guardian Verification' : 'Verify Your Email'}
          </h1>
          <p className="su-verify__body">
            {isMinor ? (
              <>
                We&apos;ve sent an email to your parent or guardian to verify your account. Before we
                can start exploring, they need to click the magical link we sent them!
              </>
            ) : (
              <>
                We&apos;ve sent a verification link to <strong>{sentTo}</strong>. Click the link in
                that email to activate your account and start exploring!
              </>
            )}
          </p>

          <div className="su-verify__hint">
            <Info size={20} aria-hidden="true" className="su-verify__hint-icon" />
            <div>
              <strong>{isMinor ? 'Did they miss it?' : "Didn't get it?"}</strong>
              <p>Make sure {isMinor ? 'they check their' : 'you check your'} spam folder.</p>
            </div>
          </div>
        </section>

        <button
          type="button"
          className="su-submit su-verify__resend"
          onClick={() => setResent(true)}
        >
          <MailCheck size={20} aria-hidden="true" />
          {resent ? 'Verification Email Sent' : 'Resend Verification Email'}
        </button>

        {/* TEMP(demo): no real inbox to click through — let the flow continue.
            Patients head to login (→ first-run profile setup → home). */}
        <button type="button" className="su-link su-verify__continue" onClick={proceed}>
          {isTherapist ? 'I’ve verified — continue' : 'Verified? Log in'}
        </button>
      </div>
    </div>
  );
}
