/**
 * LoginScreen — account sign-in for the grown-up (parent/guardian/therapist).
 *
 * Kid-friendly but adult-facing. Email + password only (no OAuth/2FA yet).
 * Auth is mocked for now: a valid-looking email + a password proceeds to the
 * child profile picker. Replace `submit` with a real API call later.
 */
import { useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { useApp } from '../store/AppStore';
import './auth.css';

export function LoginScreen(): JSX.Element {
  const { navigate } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // TEMP(testing): auth is bypassed — clicking "Log in" proceeds with no
    // credentials. Restore validation + a real sign-in call before launch.
    navigate('profiles');
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-mascot" aria-hidden="true">
          🦊
        </div>
        <h1 className="auth-title">Welcome back!</h1>
        <p className="auth-sub">Log in to keep practicing with Pip</p>

        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="grown-up@email.com"
            autoComplete="email"
          />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <div className="auth-password">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
          Forgot password?
        </button>

        <button type="submit" className="auth-submit">
          Log in
        </button>

        <p className="auth-foot">
          New here?{' '}
          <button
            type="button"
            className="auth-link"
            onClick={() => window.alert('Create an account — coming soon')}
          >
            Create an account
          </button>
        </p>
      </form>
    </div>
  );
}
