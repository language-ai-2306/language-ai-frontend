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
import type { ReactNode } from 'react';

import { useApp, type Screen } from '../store/AppStore';
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

/** Initials from a full name, e.g. "Eleanor Vance" → "EV". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase() || '?';
}

interface DoctorShellProps {
  /** Which nav tab to highlight; omit on non-section pages (e.g. the profile). */
  active?: DoctorTab;
  /** Show the page footer (default true). */
  footer?: boolean;
  children: ReactNode;
}

export function DoctorShell({ active, footer = true, children }: DoctorShellProps): JSX.Element {
  const { state, navigate } = useApp();
  const doctorName = state.name.trim() || 'Dr. Vance';

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
          <div className="doc-nav__wrap">
            <button
              type="button"
              className="doc-nav__brand"
              onClick={() => navigate('docPatients')}
            >
              LanguageAI
            </button>

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
                {initials(doctorName)}
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
                <a href="#privacy">Privacy Policy</a>
                <a href="#terms">Terms of Service</a>
                <a href="#support">Support</a>
                <a href="#contact">Contact</a>
              </nav>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
