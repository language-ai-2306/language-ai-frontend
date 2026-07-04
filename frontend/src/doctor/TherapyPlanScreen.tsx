/**
 * TherapyPlanScreen — a patient's personalized weekly exercise plan (desktop-only,
 * tab-less focused page). Shows the plan summary + a per-exercise schedule with
 * the difficulty level set for each game.
 *
 * The plan rows are static demo content for now (matching the design); wire to
 * GET /v1/plans/{id} (+ its items) once a plan is selected/created.
 */
import {
  ArrowLeft,
  Bot,
  BookOpen,
  BookText,
  Check,
  Clock,
  Compass,
  Dumbbell,
  FileDown,
  Image as ImageIcon,
  Info,
  Pencil,
  Speech,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import { useApp } from '../store/AppStore';
import { DoctorShell } from './DoctorShell';
import './therapy-plan.css';

type Tint = 'purple' | 'lilac' | 'peach';

interface Exercise {
  name: string;
  Icon: LucideIcon;
  tint: Tint;
  ai?: boolean;
  days: string;
  duration: string;
  /** Difficulty pills, in order. Empty for adaptive/AI exercises. */
  levels: string[];
  /** The currently-selected level (highlighted). Null when N/A. */
  selected: string | null;
  /** Adaptive AI conversation instead of difficulty levels (Talk with Ollie). */
  adaptive?: boolean;
}

const EXERCISES: Exercise[] = [
  {
    name: 'Read It Loud',
    Icon: BookText,
    tint: 'purple',
    days: 'Mon, Wed, Fri',
    duration: '10–20 mins',
    levels: ['Easy', 'Medium', 'Hard'],
    selected: 'Medium',
  },
  {
    name: 'Picture Talk',
    Icon: ImageIcon,
    tint: 'lilac',
    days: 'Tue, Thu',
    duration: '10–20 mins',
    levels: ['Easy', 'Medium', 'Hard'],
    selected: 'Medium',
  },
  {
    name: 'Story Teller',
    Icon: BookOpen,
    tint: 'lilac',
    days: 'Mon, Thu',
    duration: '10–20 mins',
    levels: ['Easy', 'Medium', 'Hard'],
    selected: 'Easy',
  },
  {
    name: 'Repeat After Me',
    Icon: Speech,
    tint: 'peach',
    days: 'Daily',
    duration: '10–20 mins',
    levels: ['Easy', 'Medium', 'Hard', 'Tongue Twister'],
    selected: 'Medium',
  },
  {
    name: 'Talk with Ollie',
    Icon: Bot,
    tint: 'lilac',
    ai: true,
    days: 'Daily',
    duration: '10–20 mins',
    levels: [],
    selected: null,
    adaptive: true,
  },
];

function DifficultyCell({ ex }: { ex: Exercise }): JSX.Element {
  if (ex.adaptive) {
    return (
      <div className="tp-diff">
        <span className="tp-adaptive">
          <Compass size={14} aria-hidden="true" /> Adaptive AI Conversation
        </span>
        <span className="tp-nolevels">No levels</span>
      </div>
    );
  }
  return (
    <div className="tp-diff">
      {ex.levels.map((lvl) => {
        const on = lvl === ex.selected;
        return (
          <span key={lvl} className={`tp-pill${on ? ' tp-pill--on' : ''}`}>
            {lvl}
            {on && <Check size={14} aria-hidden="true" />}
          </span>
        );
      })}
    </div>
  );
}

export function TherapyPlanScreen(): JSX.Element {
  const { navigate, setPlanEditorMode } = useApp();

  const openEditor = (): void => {
    setPlanEditorMode('edit');
    navigate('docEditTherapyPlan');
  };

  return (
    <DoctorShell showTabs={false}>
      <div className="doc-page tp-page">
        <button
          type="button"
          className="tp-back"
          onClick={() => navigate('docPatientDetail')}
        >
          <ArrowLeft size={18} aria-hidden="true" /> Back to Patient Profile
        </button>

        <div className="tp-head">
          <div>
            <h1 className="tp-title">Therapy Plan</h1>
            <p className="tp-sub">Personalized weekly exercise plan for the patient.</p>
          </div>
          <div className="tp-head__actions">
            <button type="button" className="doc-btn doc-btn--ghost" onClick={() => undefined}>
              <FileDown size={17} aria-hidden="true" /> Download PDF
            </button>
            <button type="button" className="doc-btn doc-btn--primary" onClick={openEditor}>
              <Pencil size={16} aria-hidden="true" /> Edit Plan
            </button>
          </div>
        </div>

        <div className="tp-stats">
          <div className="tp-stat">
            <span className="tp-stat__icon tp-stat__icon--purple">
              <Dumbbell size={20} aria-hidden="true" />
            </span>
            <div>
              <span className="tp-stat__label">Total Exercises</span>
              <span className="tp-stat__value">
                5 <small>Active</small>
              </span>
            </div>
          </div>
          <div className="tp-stat">
            <span className="tp-stat__icon tp-stat__icon--purple">
              <Clock size={20} aria-hidden="true" />
            </span>
            <div>
              <span className="tp-stat__label">Daily Practice</span>
              <span className="tp-stat__value">
                10–20 <small>mins</small>
              </span>
            </div>
          </div>
          <div className="tp-stat">
            <span className="tp-stat__icon tp-stat__icon--green">
              <Sparkles size={20} aria-hidden="true" />
            </span>
            <div>
              <span className="tp-stat__label">AI Personalization</span>
              <span className="tp-stat__value tp-stat__value--green">Enabled</span>
            </div>
          </div>
        </div>

        <div className="tp-table-wrap">
          <table className="tp-table">
            <thead>
              <tr>
                <th>Exercise Name</th>
                <th>Recommended Days</th>
                <th>Daily Duration</th>
                <th>Difficulty Levels</th>
              </tr>
            </thead>
            <tbody>
              {EXERCISES.map((ex) => (
                <tr key={ex.name}>
                  <td>
                    <div className="tp-exname">
                      <span className={`tp-exicon tp-exicon--${ex.tint}`}>
                        <ex.Icon size={18} aria-hidden="true" />
                      </span>
                      <span className="tp-exname__label">{ex.name}</span>
                      {ex.ai && <span className="tp-aibadge">AI</span>}
                    </div>
                  </td>
                  <td className="tp-days">{ex.days}</td>
                  <td className="tp-dur">{ex.duration}</td>
                  <td>
                    <DifficultyCell ex={ex} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="tp-note">
          <Info size={17} aria-hidden="true" />
          This therapy plan has been personalized based on the child&apos;s speech assessment and
          will automatically evolve as the child progresses.
        </p>
      </div>
    </DoctorShell>
  );
}
