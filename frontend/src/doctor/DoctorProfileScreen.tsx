/**
 * DoctorProfileScreen — the clinician's own profile / bio (desktop-only), reached
 * from the nav avatar.
 *
 * Real fields (name, email, phone) come from GET /auth/me. The professional
 * fields in the mockup — qualification, experience, license, specializations,
 * registration authority, clinic address — have NO endpoint yet, so they render
 * as editable placeholders until a doctor-profile API exists. Logout is live.
 */
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  Bell,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
} from 'lucide-react';

import { me } from '../api/auth';
import { doctorDisplayName, doctorInitials } from '../api/doctors';
import type { UserRead } from '../types/api';
import { useApp } from '../store/AppStore';
import { DoctorShell } from './DoctorShell';
import './doctor-profile.css';

/** Placeholder professional details — no API yet (see file header). */
const PLACEHOLDER = {
  qualification: 'M.S. CCC-SLP',
  experience: '12 Years',
  license: 'SLP-492018',
  bio: [
    'Dedicated to empowering individuals through evidence-based speech and language intervention. Specializing in pediatric articulation and adult aphasia recovery.',
    'A fully certified Speech-Language Pathologist with over a decade of clinical experience across hospital and private-practice settings, blending rigorous methodology with an empathetic understanding of each patient’s daily challenges.',
  ],
  primarySpecialization: 'Pediatric Articulation & Phonology',
  secondaryFocus: 'Adult Aphasia Rehabilitation',
  registrationAuthority: 'ASHA (American Speech-Language-Hearing Association)',
  stateLicensure: 'State Board of Speech-Language Pathology',
  clinic: 'Suite 402, Medical Arts Bldg',
};


export function DoctorProfileScreen(): JSX.Element {
  const { state, navigate, logout } = useApp();
  const [user, setUser] = useState<UserRead | null>(null);

  // Profile opens from the avatar menu on any page, so Back returns to wherever
  // the user came from (falling back to the patient dashboard).
  const backTarget =
    state.previousScreen && state.previousScreen !== 'docProfile'
      ? state.previousScreen
      : 'docPatients';

  // Pull real identity fields; failures just leave the store fallbacks in place.
  useEffect(() => {
    let alive = true;
    me()
      .then((u) => alive && setUser(u))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const fullName =
    (user ? doctorDisplayName(user.first_name, user.last_name) : doctorDisplayName(state.name)) ||
    'Dr. Vance';
  const email = user?.email ?? '—';
  const phone = user?.phone_number ?? 'Not provided';

  return (
    <DoctorShell>
      <div className="doc-page dp-page">
        <button type="button" className="dp-back" onClick={() => navigate(backTarget)}>
          <ArrowLeft size={18} aria-hidden="true" /> Back
        </button>

        {/* Hero */}
        <section className="dp-hero">
          <span className="dp-hero__avatar" aria-hidden="true">
            {doctorInitials(user ? user.first_name : state.name, user?.last_name) || 'DR'}
            <span className="dp-hero__online" />
          </span>
          <div className="dp-hero__body">
            <h1 className="dp-hero__name">
              {fullName} <span className="dp-hero__badge">Speech Therapist</span>
            </h1>
            <p className="dp-hero__tagline">{PLACEHOLDER.bio[0]}</p>
            <div className="dp-hero__chips">
              <span className="dp-chip">
                <Award size={16} aria-hidden="true" />
                <span>
                  <small>Qualification</small>
                  {PLACEHOLDER.qualification}
                </span>
              </span>
              <span className="dp-chip">
                <Briefcase size={16} aria-hidden="true" />
                <span>
                  <small>Experience</small>
                  {PLACEHOLDER.experience}
                </span>
              </span>
              <span className="dp-chip">
                <BadgeCheck size={16} aria-hidden="true" />
                <span>
                  <small>License Number</small>
                  {PLACEHOLDER.license}
                </span>
              </span>
            </div>
          </div>
        </section>

        <div className="dp-cols">
          {/* Left column */}
          <div className="dp-col">
            <section className="dp-card">
              <div className="dp-card__head">
                <h2 className="dp-card__title">
                  <BookOpen size={18} aria-hidden="true" /> Biography
                </h2>
                <button type="button" className="dp-editlink" onClick={() => undefined}>
                  <Pencil size={14} aria-hidden="true" /> Edit Bio
                </button>
              </div>
              {PLACEHOLDER.bio.map((p, i) => (
                <p key={i} className="dp-bio">
                  {p}
                </p>
              ))}
            </section>

            <section className="dp-card">
              <h2 className="dp-card__title">
                <ShieldCheck size={18} aria-hidden="true" /> Professional Portfolio
              </h2>
              <div className="dp-portfolio">
                <div>
                  <span className="dp-label">Primary Specialization</span>
                  <span className="dp-value">{PLACEHOLDER.primarySpecialization}</span>
                </div>
                <div>
                  <span className="dp-label">Secondary Focus</span>
                  <span className="dp-value">{PLACEHOLDER.secondaryFocus}</span>
                </div>
                <div>
                  <span className="dp-label">Registration Authority</span>
                  <span className="dp-value">
                    {PLACEHOLDER.registrationAuthority}
                    <CheckCircle2 size={15} className="dp-verified" aria-label="Verified" />
                  </span>
                </div>
                <div>
                  <span className="dp-label">State Licensure</span>
                  <span className="dp-value">{PLACEHOLDER.stateLicensure}</span>
                </div>
              </div>
            </section>
          </div>

          {/* Right column */}
          <div className="dp-col">
            <section className="dp-card">
              <h2 className="dp-card__title">Contact Details</h2>
              <ul className="dp-contact">
                <li>
                  <Mail size={18} aria-hidden="true" />
                  <div>
                    <span className="dp-label">Email Address</span>
                    <span className="dp-value">{email}</span>
                  </div>
                </li>
                <li>
                  <Phone size={18} aria-hidden="true" />
                  <div>
                    <span className="dp-label">Direct Phone</span>
                    <span className="dp-value">{phone}</span>
                  </div>
                </li>
                <li>
                  <MapPin size={18} aria-hidden="true" />
                  <div>
                    <span className="dp-label">Clinic Location</span>
                    <span className="dp-value">{PLACEHOLDER.clinic}</span>
                  </div>
                </li>
              </ul>
            </section>

            <section className="dp-card dp-account">
              <span className="dp-account__title">Account Management</span>
              <button type="button" className="dp-acc-btn dp-acc-btn--primary" onClick={() => undefined}>
                Update Details <ArrowRight size={16} aria-hidden="true" />
              </button>
              <button type="button" className="dp-acc-btn" onClick={() => undefined}>
                Change Password <Lock size={15} aria-hidden="true" />
              </button>
              <button type="button" className="dp-acc-btn" onClick={() => undefined}>
                Manage Notifications <Bell size={15} aria-hidden="true" />
              </button>
              <button type="button" className="dp-acc-btn dp-acc-btn--danger" onClick={logout}>
                Logout Securely <LogOut size={15} aria-hidden="true" />
              </button>
            </section>
          </div>
        </div>
      </div>
    </DoctorShell>
  );
}
