/**
 * DoctorShell — shared chrome for the desktop-only clinician portal: the top
 * navigation bar (wordmark, tabs, notifications, avatar) and the page footer,
 * with a hard desktop-only gate below 768px (phones see a "use a desktop"
 * message instead of the portal).
 *
 * Each portal screen renders its content as children and declares which nav tab
 * is active. Tabs without a `screen` yet render disabled ("coming soon").
 */
import { Bell, Monitor } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { doctorInitials } from '../api/doctors';
import { useApp, type Screen } from '../store/AppStore';
import { LegalModal } from '../legal/LegalModal';
import type { LegalKind } from '../legal/legalDocs';
import './doctor.css';

export type DoctorTab = 'patients' | 'requests' | 'plans';

interface TabDef {
  id: DoctorTab;
  label: string;
  screen: Screen | null; // null → not built yet (rendered disabled)
}

const TABS: TabDef[] = [
  { id: 'patients', label: 'All Patients', screen: 'docPatients' },
  { id: 'requests', label: 'New Requests', screen: 'docRequests' },
  { id: 'plans', label: 'Plans', screen: 'docPlans' },
];


interface DoctorShellProps {
  /** Which nav tab to highlight; omit on non-section pages (e.g. the profile). */
  active?: DoctorTab;
  /** Show the page footer (default true). */
  footer?: boolean;
  /** Show the section tabs (default true). Hidden on focused sub-pages like the
   *  Therapy Plan detail, which stand alone with just the brand + account. */
  showTabs?: boolean;
  children: ReactNode;
}

export function DoctorShell({ active, footer = true, showTabs = true, children }: DoctorShellProps): JSX.Element {
  const { state, navigate } = useApp();
  const doctorName = state.name.trim() || 'Dr. Vance';
  const [legal, setLegal] = useState<LegalKind | null>(null);

  return (
    <div className="doc-portal">
      {/* Desktop-only gate — visible only below 768px (see doctor.css). */}
      <div className="doc-gate" role="alert">
        <Monitor size={44} aria-hidden="true" />
        <h1 className="doc-gate__title">Desktop only</h1>
        <p className="doc-gate__text">
          The clinician portal is designed for a larger screen. Please open LanguageAI on a
          desktop or laptop to manage your patients.
        </p>
      </div>

      <div className="doc-portal__inner">
        <header className="doc-nav">
          <div className={`doc-nav__wrap${showTabs ? '' : ' doc-nav__wrap--notabs'}`}>
            <button
              type="button"
              className="doc-nav__brand"
              onClick={() => navigate('docPatients')}
            >
              LanguageAI
            </button>

            {showTabs && (
            <nav className="doc-nav__tabs" aria-label="Portal sections">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`doc-nav__tab${t.id === active ? ' is-active' : ''}`}
                  disabled={!t.screen}
                  aria-current={t.id === active ? 'page' : undefined}
                  title={t.screen ? undefined : 'Coming soon'}
                  onClick={() => t.screen && navigate(t.screen)}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            )}

            <div className="doc-nav__right">
              <button type="button" className="doc-nav__icon" aria-label="Notifications">
                <Bell size={20} aria-hidden="true" />
                <span className="doc-nav__dot" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="doc-nav__avatar"
                onClick={() => navigate('docProfile')}
                aria-label="Your profile"
              >
                {doctorInitials(doctorName) || '?'}
              </button>
            </div>
          </div>
        </header>

        <main className="doc-main">{children}</main>

        {footer && (
          <footer className="doc-footer">
            <div className="doc-footer__wrap">
              <div className="doc-footer__brand">
                <strong>LanguageAI</strong>
                <span>© 2026 LanguageAI. Clinical Excellence in Speech Therapy.</span>
              </div>
              <nav className="doc-footer__links" aria-label="Legal">
                <a
                  href="#privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    setLegal('privacy');
                  }}
                >
                  Privacy Policy
                </a>
                <a
                  href="#terms"
                  onClick={(e) => {
                    e.preventDefault();
                    setLegal('terms');
                  }}
                >
                  Terms of Service
                </a>
                <a href="#support">Support</a>
                <a href="#contact">Contact</a>
              </nav>
            </div>
          </footer>
        )}
      </div>
      {legal && <LegalModal audience="therapist" kind={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}
