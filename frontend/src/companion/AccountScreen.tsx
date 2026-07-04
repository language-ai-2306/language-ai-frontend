/**
 * AccountScreen — the signed-in user's profile: view/edit account info
 * (name, DOB, gender, phone) and log out. Email + role are read-only.
 */
import { useEffect, useState, type ChangeEvent } from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';

import { me } from '../api/auth';
import { ApiError } from '../api/client';
import { updateUser } from '../api/users';
import { useApp } from '../store/AppStore';
import type { UserRead } from '../types/api';
import { AvatarImage } from './components/AvatarImage';
import { AvatarPicker } from './components/AvatarPicker';
import './account.css';

const GENDERS = [
  { v: 'F', l: 'Female' },
  { v: 'M', l: 'Male' },
  { v: 'O', l: 'Other' },
];

interface Form {
  first_name: string;
  last_name: string;
  dob: string;
  gender: string;
  phone_number: string;
  avatar_url: string;
}

const EMPTY: Form = { first_name: '', last_name: '', dob: '', gender: '', phone_number: '', avatar_url: '' };

export function AccountScreen(): JSX.Element {
  const { navigate, logout, setName, setAvatarUrl } = useApp();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserRead | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    me()
      .then((u) => {
        if (!alive) return;
        setUser(u);
        setForm({
          first_name: u.first_name ?? '',
          last_name: u.last_name ?? '',
          dob: u.dob ?? '',
          gender: u.gender ?? '',
          phone_number: u.phone_number ?? '',
          avatar_url: u.avatar_url ?? '',
        });
        setLoading(false);
      })
      .catch(() => {
        if (alive) {
          setError('Could not load your account.');
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const set =
    (key: keyof Form) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setSaved(false);
    };

  const save = async (): Promise<void> => {
    if (!user) return;
    setError('');
    setSaving(true);
    try {
      const isPatient = user.role === 'PATIENT';
      const updated = await updateUser(user.id, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        phone_number: form.phone_number.trim() || null,
        ...(isPatient ? { avatar_url: form.avatar_url || null } : {}),
      });
      setUser(updated);
      setName(updated.first_name); // keep the home greeting in sync
      if (isPatient) setAvatarUrl(updated.avatar_url ?? null); // sync the avatar everywhere
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="acc-screen">
      <header className="acc-topbar">
        <button className="acc-back" onClick={() => navigate('profile')} aria-label="Back to profile">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="acc-title">My Account</h1>
      </header>

      <main className="acc-main">
        {loading ? (
          <p className="acc-loading">Loading…</p>
        ) : (
          <>
            <div className="acc-card">
              {user?.role === 'PATIENT' && (
                <div className="acc-avatar">
                  <AvatarImage url={form.avatar_url || null} size={96} />
                  <span className="acc-avatar__label">Choose your buddy</span>
                  <AvatarPicker
                    value={form.avatar_url || null}
                    onChange={(url) => {
                      setForm((f) => ({ ...f, avatar_url: url }));
                      setSaved(false);
                    }}
                  />
                </div>
              )}

              <div className="acc-row">
                <label className="acc-field">
                  <span>First Name</span>
                  <input value={form.first_name} onChange={set('first_name')} autoComplete="given-name" />
                </label>
                <label className="acc-field">
                  <span>Last Name</span>
                  <input value={form.last_name} onChange={set('last_name')} autoComplete="family-name" />
                </label>
              </div>

              <label className="acc-field">
                <span>Email</span>
                <input value={user?.email ?? ''} disabled title="Email can't be changed" />
              </label>

              <div className="acc-row">
                <label className="acc-field">
                  <span>Date of Birth</span>
                  <input type="date" value={form.dob} onChange={set('dob')} />
                </label>
                <label className="acc-field">
                  <span>Gender</span>
                  <select className={form.gender ? '' : 'is-placeholder'} value={form.gender} onChange={set('gender')}>
                    <option value="" disabled>
                      Select…
                    </option>
                    {GENDERS.map((g) => (
                      <option key={g.v} value={g.v}>
                        {g.l}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="acc-field">
                <span>Phone Number</span>
                <input type="tel" value={form.phone_number} onChange={set('phone_number')} autoComplete="tel" />
              </label>

              {error && <p className="acc-error" role="alert">{error}</p>}
              {saved && <p className="acc-saved" role="status">Saved!</p>}

              <button type="button" className="acc-save" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>

            <button type="button" className="acc-logout" onClick={logout}>
              <LogOut size={20} aria-hidden="true" /> Log Out
            </button>
          </>
        )}
      </main>
    </div>
  );
}
