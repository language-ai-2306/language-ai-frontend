/**
 * LoginScreen — account sign-in for the grown-up (parent/guardian/therapist).
 *
 * Adult-facing, on-brand: chat-bubble logo + "LanguageAI" wordmark, email +
 * password with in-field icons, and a pill "Login" action.
 * Auth is mocked for now: submitting proceeds to the child profile picker /
 * quick check. Replace `submit` with a real API call to /auth later.
 */
import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';

import { useApp } from '../store/AppStore';
import { login } from '../api/auth';
import { ApiError } from '../api/client';
import { getToken } from '../api/token';
import './auth.css';

export function LoginScreen(): JSX.Element {
  const { navigate, setAuthToken, setName, setAvatarUrl, setRole } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password); // stores token + returns /auth/me
      setAuthToken(getToken()); // mirror into the store
      setRole(user.role); // persisted → a reloaded doctor boots to the portal
      setName(user.first_name ?? '');
      setAvatarUrl(user.avatar_url ?? null);
      // Doctors go to the desktop clinician portal; patients to the kid dashboard.
      navigate(user.role === 'DOCTOR' ? 'docPatients' : 'home');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <button
          type="button"
          className="auth-back"
          onClick={() => navigate('landing')}
          aria-label="Back to landing page"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <img
          className="auth-logo-img"
          src="/login-logo.png"
          alt="LanguageAI"
          style={{ width: 243, height: 'auto', display: 'block', margin: '-24px auto -48px' }}
        />
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

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Login'}
          {!submitting && <ArrowRight size={22} aria-hidden="true" />}
        </button>

        <hr className="auth-divider" />

        <p className="auth-foot">
          Don't have an account?{' '}
          <button type="button" className="auth-link" onClick={() => navigate('signup')}>
            Sign up
          </button>
        </p>
      </form>
    </div>
  );
}
