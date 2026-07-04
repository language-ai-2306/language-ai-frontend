/**
 * PlanTemplatesScreen — the library of clinically-validated foundational plans a
 * clinician can start from (reached via "Choose from Existing Plans"). Selecting a
 * template opens the Therapy Plan builder pre-seeded from it.
 *
 * The template set is static demo content for now (like the rest of the doctor
 * portal's not-yet-wired surfaces); swap for a GET /v1/plan-templates call later.
 */
import {
  ArrowLeft,
  AudioWaveform,
  Compass,
  Droplet,
  MessagesSquare,
  Speech,
  type LucideIcon,
} from 'lucide-react';

import { useApp } from '../store/AppStore';
import { DoctorShell } from './DoctorShell';
import './plan-templates.css';

interface Template {
  id: string;
  title: string;
  desc: string;
  Icon: LucideIcon;
}

const TEMPLATES: Template[] = [
  {
    id: 'articulation',
    title: 'Articulation Focus',
    desc: 'Targeted exercises for speech sound production and phonological awareness.',
    Icon: Speech,
  },
  {
    id: 'stuttering',
    title: 'Stuttering Management',
    desc: 'Strategies and fluency shaping techniques to reduce dysfluencies and build confidence.',
    Icon: AudioWaveform,
  },
  {
    id: 'language-delay',
    title: 'Language Delay Explorer',
    desc: 'Comprehensive protocols for expressive and receptive language development in early learners.',
    Icon: Compass,
  },
  {
    id: 'fluency',
    title: 'Fluency Foundations',
    desc: 'Core exercises for pacing, breath control, and smooth speech transitions.',
    Icon: Droplet,
  },
  {
    id: 'social',
    title: 'Social Communication',
    desc: 'Pragmatic language skills, turn-taking, and contextual interaction modules.',
    Icon: MessagesSquare,
  },
];

export function PlanTemplatesScreen(): JSX.Element {
  const { navigate } = useApp();

  return (
    <DoctorShell>
      <div className="doc-page">
        <button
          type="button"
          className="tpl-back"
          onClick={() => navigate('docPatientDetail')}
        >
          <ArrowLeft size={18} aria-hidden="true" /> Back
        </button>

        <h1 className="doc-page__title tpl-title">Therapy Plan Templates</h1>
        <p className="doc-page__sub tpl-sub">
          Select a clinically validated foundational plan to customize for your patient&apos;s
          specific therapeutic needs.
        </p>

        <div className="tpl-grid">
          {TEMPLATES.map(({ id, title, desc, Icon }) => (
            <article key={id} className="tpl-card">
              <div className="tpl-card__body">
                <span className="tpl-card__icon">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h2 className="tpl-card__title">{title}</h2>
                <p className="tpl-card__desc">{desc}</p>
              </div>
              <button
                type="button"
                className="tpl-card__link"
                onClick={() => navigate('docTherapyPlan')}
              >
                View Details
              </button>
            </article>
          ))}
        </div>
      </div>
    </DoctorShell>
  );
}
