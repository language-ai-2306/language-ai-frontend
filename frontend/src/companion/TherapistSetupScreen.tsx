/**
 * TherapistSetupScreen — the clinician's account-setup step, shown after a
 * therapist verifies their email. Collects professional details, a clinic
 * address, and an optional profile photo, then hands off to the
 * "Onboarding Complete" confirmation.
 *
 * MVP: no API. "Complete Setup" just flags onboarding done and advances the
 * flow; the photo is previewed client-side (never uploaded). Wire these to
 * POST /therapists/profile + a real upload when the backend lands.
 */
import { useRef, useState, type ChangeEvent } from 'react';
import { User } from 'lucide-react';

import { useApp } from '../store/AppStore';
import './therapistsetup.css';

const BIO_MAX = 500;
/** A short country list for the picker (MVP placeholder). */
const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'India',
  'Germany',
  'France',
];

export function TherapistSetupScreen(): JSX.Element {
  const { navigate, setProfileComplete } = useApp();
  const [qualification, setQualification] = useState('');
  const [bio, setBio] = useState('');
  const [street, setStreet] = useState('');
  const [unit, setUnit] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postal, setPostal] = useState('');
  const [country, setCountry] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickPhoto = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) setPhoto(URL.createObjectURL(file)); // client-side preview only
  };

  const completeSetup = (): void => {
    // MVP: nothing is persisted server-side — just mark onboarding done and
    // show the confirmation screen.
    setProfileComplete(true);
    navigate('onboardingComplete');
  };

  return (
    <div className="ts-screen">
      <div className="ts-card">
        <h1 className="ts-title">Account Setup</h1>
        <p className="ts-sub">Almost ready to start helping kids grow!</p>

        {/* ---- Professional Details ---- */}
        <h2 className="ts-heading">Professional Details</h2>
        <label className="ts-field">
          <span>Qualification / Degree</span>
          <input
            value={qualification}
            onChange={(e) => setQualification(e.target.value)}
            placeholder="e.g., MS Speech-Language Pathology"
          />
        </label>
        <label className="ts-field">
          <span className="ts-field__row">
            Professional Bio
            <span className="ts-counter">{bio.length}/{BIO_MAX}</span>
          </span>
          <textarea
            className="ts-textarea"
            value={bio}
            maxLength={BIO_MAX}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us a little about your experience…"
            rows={4}
          />
        </label>

        {/* ---- Clinic Address ---- */}
        <h2 className="ts-heading">Clinic Address</h2>
        <label className="ts-field">
          <span>Street Address</span>
          <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="123 Therapy Lane" autoComplete="address-line1" />
        </label>
        <label className="ts-field">
          <span>Unit / Suite</span>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Suite 100" autoComplete="address-line2" />
        </label>
        <label className="ts-field">
          <span>City</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Springfield" autoComplete="address-level2" />
        </label>
        <label className="ts-field">
          <span>State / Province</span>
          <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="State" autoComplete="address-level1" />
        </label>
        <label className="ts-field">
          <span>Postal Code</span>
          <input value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="12345" autoComplete="postal-code" />
        </label>
        <label className="ts-field">
          <span>Country</span>
          <select className={country ? '' : 'is-placeholder'} value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="" disabled>Select Country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        {/* ---- Profile Photo ---- */}
        <h2 className="ts-heading">Profile Photo</h2>
        <div className="ts-photo">
          <div className="ts-photo__avatar">
            {photo ? (
              <img src={photo} alt="Profile preview" />
            ) : (
              <User size={40} aria-hidden="true" />
            )}
          </div>
          <button type="button" className="ts-photo__btn" onClick={() => fileRef.current?.click()}>
            Upload Photo
          </button>
          <p className="ts-photo__hint">JPEG or PNG, max 5MB</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            className="ts-photo__input"
            onChange={onPickPhoto}
          />
        </div>

        <button type="button" className="ts-cta" onClick={completeSetup}>
          Complete Setup
        </button>
      </div>
    </div>
  );
}
