/**
 * SignUpScreen — "Create Account" for the two kinds of user: a Patient (the
 * learner, often a minor) and a Therapist (the clinician). A segmented toggle
 * at the top swaps between the two field sets.
 *
 * Patients under the guardian-required age reveal a "Guardian Details" section;
 * their verification email is sent to the guardian. Auth is mocked for now:
 * "Complete Sign Up" runs light client-side validation, stashes who signed up
 * (for the verification screen), and navigates to `verifyEmail`. Replace the
 * body of `submit` with a real POST /auth/register when the API lands.
 */
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';

import { useApp, type UserType } from '../store/AppStore';
import { signup, toGenderCode } from '../api/auth';
import { ApiError } from '../api/client';
import { PATIENT_AVATARS } from './avatars';
import { AvatarPicker } from './components/AvatarPicker';
import './signup.css';

/** Age at or below which a patient must supply guardian details. */
const GUARDIAN_AGE = 18;
/** Minimum password length we accept in the mock validation. */
const MIN_PASSWORD = 8;

const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'] as const;
const TITLES = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Mx.'] as const;
const RELATIONSHIPS = ['Parent', 'Guardian', 'Grandparent', 'Sibling', 'Other'] as const;
/** A short list of dialling codes for the phone-number picker. */
const DIAL_CODES = ['+1', '+44', '+61', '+91', '+49', '+33', '+81'] as const;

interface FormState {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  dob: string;
  gender: string;
  dialCode: string;
  phone: string;
  licenseNumber: string;
  password: string;
  confirmPassword: string;
  guardianName: string;
  guardianRelationship: string;
  guardianEmail: string;
}

const EMPTY_FORM: FormState = {
  title: 'Dr.',
  firstName: '',
  lastName: '',
  email: '',
  dob: '',
  gender: '',
  dialCode: '+1',
  phone: '',
  licenseNumber: '',
  password: '',
  confirmPassword: '',
  guardianName: '',
  guardianRelationship: '',
  guardianEmail: '',
};

/** Whole years between `dob` (YYYY-MM-DD) and today; null if unparseable/empty. */
function ageFromDob(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function SignUpScreen(): JSX.Element {
  const { navigate, setName, setPendingVerification, setSignupDraft } = useApp();
  const [userType, setUserType] = useState<UserType>('patient');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [agree, setAgree] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [avatar, setAvatar] = useState<string>(PATIENT_AVATARS[0].url);

  const set =
    (key: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const age = useMemo(() => ageFromDob(form.dob), [form.dob]);
  // Patients default to showing guardian details (children are the norm); the
  // section hides only once an adult date of birth is entered.
  const needsGuardian = userType === 'patient' && (age === null || age < GUARDIAN_AGE);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const required =
      form.firstName.trim() &&
      form.lastName.trim() &&
      form.email.trim() &&
      form.dob &&
      form.gender &&
      form.password &&
      form.confirmPassword;
    if (!required) {
      setError('Please fill in all required fields (including date of birth and gender).');
      return;
    }
    if (userType === 'therapist' && !form.licenseNumber.trim()) {
      setError('Please enter your professional license number.');
      return;
    }
    if (form.password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (needsGuardian && (!form.guardianName.trim() || !form.guardianEmail.trim())) {
      setError('Guardian name and email are required for younger learners.');
      return;
    }
    if (!agree) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setName(form.firstName.trim());
    const phone = form.phone.trim() ? `${form.dialCode}${form.phone.trim()}` : '';
    // Carry identity forward. Doctors finish signup on TherapistSetup (which
    // collects the required qualification/bio); patients are created right here.
    setSignupDraft({
      userType,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      dob: form.dob,
      gender: form.gender,
      phone,
      password: form.password,
    });
    setPendingVerification({
      userType,
      email: form.email.trim(),
      isMinor: needsGuardian,
      guardianEmail: form.guardianEmail.trim(),
    });

    if (userType === 'patient') {
      setSubmitting(true);
      try {
        await signup({
          role: 'PATIENT',
          email: form.email.trim(),
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          dob: form.dob,
          gender: toGenderCode(form.gender),
          password: form.password,
          phone_number: phone || null,
          // Refined later on ProfileSetup; the backend requires a non-empty value.
          nickname: form.firstName.trim(),
          avatar_url: avatar,
          guardian_name: needsGuardian ? form.guardianName.trim() : null,
          guardian_relationship: needsGuardian ? form.guardianRelationship || null : null,
          guardian_email: needsGuardian ? form.guardianEmail.trim() : null,
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Sign up failed. Please try again.');
        return;
      } finally {
        setSubmitting(false);
      }
    }

    navigate('verifyEmail');
  };

  return (
    <div className="su-screen">
      <form className="su-card" onSubmit={submit} noValidate>
        <header className="su-head">
          <button
            type="button"
            className="su-back"
            onClick={() => navigate('login')}
            aria-label="Go back to login"
          >
            <ArrowLeft size={22} aria-hidden="true" />
          </button>
          <h1 className="su-title">Create Account</h1>
        </header>

        {/* Patient / Therapist segmented toggle */}
        <div className="su-toggle" role="tablist" aria-label="Account type">
          {(['patient', 'therapist'] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={userType === type}
              className={`su-toggle__btn ${userType === type ? 'is-active' : ''}`}
              onClick={() => {
                setUserType(type);
                setError('');
              }}
            >
              {type === 'patient' ? 'Patient' : 'Therapist'}
            </button>
          ))}
        </div>

        <div className="su-fields">
          {userType === 'patient' ? (
            <>
              <div className="su-row">
                <label className="su-field">
                  <span>First Name</span>
                  <input value={form.firstName} onChange={set('firstName')} placeholder="Ollie" autoComplete="given-name" />
                </label>
                <label className="su-field">
                  <span>Last Name</span>
                  <input value={form.lastName} onChange={set('lastName')} placeholder="Smith" autoComplete="family-name" />
                </label>
              </div>

              <label className="su-field">
                <span>Email</span>
                <input type="email" value={form.email} onChange={set('email')} placeholder="hello@example.com" autoComplete="email" />
              </label>

              <div className="su-row">
                <label className="su-field">
                  <span>Date of Birth</span>
                  <input type="date" value={form.dob} onChange={set('dob')} />
                </label>
                <label className="su-field">
                  <span>Gender</span>
                  <select className={form.gender ? '' : 'is-placeholder'} value={form.gender} onChange={set('gender')}>
                    <option value="" disabled>Select…</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="su-field">
                <span>Phone Number</span>
                <div className="su-phone">
                  <select className="su-phone__code" value={form.dialCode} onChange={set('dialCode')} aria-label="Country dialling code">
                    {DIAL_CODES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input type="tel" value={form.phone} onChange={set('phone')} placeholder="(555) 000-0000" autoComplete="tel-national" />
                </div>
              </label>

              <label className="su-field">
                <span>Password</span>
                <PasswordInput value={form.password} onChange={set('password')} show={showPw} onToggle={() => setShowPw((s) => !s)} autoComplete="new-password" />
              </label>

              <label className="su-field">
                <span>Confirm Password</span>
                <PasswordInput value={form.confirmPassword} onChange={set('confirmPassword')} show={showConfirm} onToggle={() => setShowConfirm((s) => !s)} autoComplete="new-password" />
              </label>

              <div className="su-field">
                <span>Pick your buddy</span>
                <AvatarPicker value={avatar} onChange={setAvatar} />
              </div>
            </>
          ) : (
            <>
              <div className="su-row">
                <label className="su-field su-field--title">
                  <span>Title</span>
                  <select value={form.title} onChange={set('title')}>
                    {TITLES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="su-field">
                  <span>First Name</span>
                  <input value={form.firstName} onChange={set('firstName')} placeholder="Jane" autoComplete="given-name" />
                </label>
              </div>

              <label className="su-field">
                <span>Last Name</span>
                <input value={form.lastName} onChange={set('lastName')} placeholder="Doe" autoComplete="family-name" />
              </label>

              <label className="su-field">
                <span>Professional Email</span>
                <div className="su-input">
                  <Mail className="su-input__icon" size={18} aria-hidden="true" />
                  <input type="email" value={form.email} onChange={set('email')} placeholder="doctor@clinic.com" autoComplete="email" />
                </div>
              </label>

              <label className="su-field">
                <span>License Number</span>
                <input value={form.licenseNumber} onChange={set('licenseNumber')} placeholder="Enter your license number" />
              </label>

              <label className="su-field">
                <span>Date of Birth</span>
                <input type="date" value={form.dob} onChange={set('dob')} />
              </label>

              <label className="su-field">
                <span>Phone Number</span>
                <div className="su-phone">
                  <select className="su-phone__code" value={form.dialCode} onChange={set('dialCode')} aria-label="Country dialling code">
                    {DIAL_CODES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input type="tel" value={form.phone} onChange={set('phone')} placeholder="(555) 000-0000" autoComplete="tel-national" />
                </div>
              </label>

              <label className="su-field">
                <span>Gender</span>
                <select className={form.gender ? '' : 'is-placeholder'} value={form.gender} onChange={set('gender')}>
                  <option value="" disabled>Select gender</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </label>

              <label className="su-field">
                <span>Password</span>
                <PasswordInput value={form.password} onChange={set('password')} show={showPw} onToggle={() => setShowPw((s) => !s)} icon autoComplete="new-password" />
              </label>

              <label className="su-field">
                <span>Confirm Password</span>
                <PasswordInput value={form.confirmPassword} onChange={set('confirmPassword')} show={showConfirm} onToggle={() => setShowConfirm((s) => !s)} icon autoComplete="new-password" />
              </label>
            </>
          )}
        </div>

        {/* Guardian details — patients under the guardian age only */}
        {needsGuardian && (
          <section className="su-guardian">
            <h2 className="su-guardian__title">Guardian Details</h2>
            <p className="su-guardian__note">
              We require guardian details for users under certain ages to ensure safety and support.
            </p>
            <label className="su-field">
              <span>Guardian Name</span>
              <input value={form.guardianName} onChange={set('guardianName')} placeholder="Guardian Full Name" />
            </label>
            <label className="su-field">
              <span>Relationship</span>
              <select className={form.guardianRelationship ? '' : 'is-placeholder'} value={form.guardianRelationship} onChange={set('guardianRelationship')}>
                <option value="" disabled>Select Relationship…</option>
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="su-field">
              <span>Guardian Email</span>
              <input type="email" value={form.guardianEmail} onChange={set('guardianEmail')} placeholder="guardian@example.com" />
            </label>
          </section>
        )}

        {error && <p className="su-error" role="alert">{error}</p>}

        <label className="su-terms">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>
            I agree to the <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a> and{' '}
            <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
          </span>
        </label>

        <button type="submit" className="su-submit" disabled={submitting}>
          {submitting ? 'Creating your account…' : 'Complete Sign Up'}
          {!submitting && <ArrowRight size={22} aria-hidden="true" />}
        </button>

        <p className="su-foot">
          Already have an account?{' '}
          <button type="button" className="su-link" onClick={() => navigate('login')}>
            Log in
          </button>
        </p>
      </form>
    </div>
  );
}

interface PasswordInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  show: boolean;
  onToggle: () => void;
  /** Show a leading lock icon (therapist styling in the mockup). */
  icon?: boolean;
  autoComplete?: string;
}

/** Password field with a show/hide toggle and an optional leading lock icon. */
function PasswordInput({ value, onChange, show, onToggle, icon = false, autoComplete }: PasswordInputProps): JSX.Element {
  return (
    <div className={`su-input ${icon ? 'su-input--icon' : ''}`}>
      {icon && <Lock className="su-input__icon" size={18} aria-hidden="true" />}
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder="••••••••"
        autoComplete={autoComplete}
      />
      <button type="button" className="su-eye" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}
