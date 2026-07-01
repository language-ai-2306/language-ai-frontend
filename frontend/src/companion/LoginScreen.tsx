/**
 * LoginScreen — account sign-in for the grown-up (parent/guardian/therapist).
 *
 * Adult-facing, on-brand: chat-bubble logo + "LanguageAI" wordmark, email +
 * password with in-field icons, and a pill "Login" action.
 * Auth is mocked for now: submitting proceeds to the child profile picker /
 * quick check. Replace `submit` with a real API call to /auth later.
 */
import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, MessagesSquare } from 'lucide-react';

import { useApp } from '../store/AppStore';
import './auth.css';

export function LoginScreen(): JSX.Element {
  const { state, navigate } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // TEMP(testing): auth is bypassed — submitting proceeds with no credentials.
    // Restore validation + a real sign-in call before launch.
    // First-time users get the quick-start intro (→ quick check); returning
    // users (who already have an assessment) go straight to Home.
    navigate(state.assessment ? 'home' : 'quickStart');
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo" aria-hidden="true">
          <MessagesSquare size={40} strokeWidth={2.4} />
        </div>
        <h1 className="auth-title">LanguageAI</h1>
        <p className="auth-sub">Welcome back! Ready to learn?</p>

        <label className="auth-field">
          <span>Email Address</span>
          <div className="auth-input">
            <Mail className="auth-input-icon" size={20} aria-hidden="true" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
        </label>

        <label className="auth-field">
          <span>Password</span>
          <div className="auth-input">
            <Lock className="auth-input-icon" size={20} aria-hidden="true" />
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
            </button>
          </div>
        </label>

        <button
          type="button"
          className="auth-forgot"
          onClick={() => window.alert('Password reset — coming soon')}
        >
          Forgot Password?
        </button>

        <button type="submit" className="auth-submit">
          Login <ArrowRight size={22} aria-hidden="true" />
        </button>

        <hr className="auth-divider" />

        <p className="auth-foot">
          Don't have an account?{' '}
          <button
            type="button"
            className="auth-link"
            onClick={() => window.alert('Create an account — coming soon')}
          >
            Sign up
          </button>
        </p>
      </form>
    </div>
  );
}
