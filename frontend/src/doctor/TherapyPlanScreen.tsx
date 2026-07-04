/**
 * TherapyPlanScreen — a patient's personalized weekly exercise plan (desktop-only,
 * tab-less focused page), loaded live from the plans API. Shows the plan summary +
 * a per-exercise schedule with the difficulty level set for each game.
 *
 * Loads the plan named by `docPlanId`, or the selected patient's active plan.
 */
import { useCallback, useEffect, useState } from 'react';
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

import { getPlan, listPlans, type PlanItem } from '../api/plans';
import { useApp } from '../store/AppStore';
import { DoctorShell } from './DoctorShell';
import { DocError } from './DocError';
import { daysLabel, difficultyLabel, exerciseLabel, levelsFor } from './planMapping';
import './therapy-plan.css';

type Tint = 'purple' | 'lilac' | 'peach';

const EXERCISE_ICON: Record<string, { Icon: LucideIcon; tint: Tint }> = {
  'Read It Loud': { Icon: BookText, tint: 'purple' },
  'Picture Talk': { Icon: ImageIcon, tint: 'lilac' },
  'Story Teller': { Icon: BookOpen, tint: 'lilac' },
  'Repeat After Me': { Icon: Speech, tint: 'peach' },
  'Talk with Ollie': { Icon: Bot, tint: 'lilac' },
};

interface LoadedPlan {
  plan_id: string;
  title: string;
  items: PlanItem[];
}

function DifficultyCell({ item }: { item: PlanItem }): JSX.Element {
  const name = exerciseLabel(item.exercise_type);
  const levels = levelsFor(name);
  if (levels.length === 0) {
    return (
      <div className="tp-diff">
        <span className="tp-adaptive">
          <Compass size={14} aria-hidden="true" /> Adaptive AI Conversation
        </span>
        <span className="tp-nolevels">No levels</span>
      </div>
    );
  }
  const selected = difficultyLabel(item.difficulty);
  return (
    <div className="tp-diff">
      {levels.map((lvl) => {
        const on = lvl === selected;
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
  const { state, navigate, setPlanEditorMode, setDocPlanId } = useApp();
  const [plan, setPlan] = useState<LoadedPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      let loaded: LoadedPlan | null = null;
      if (state.docPlanId) {
        const p = await getPlan(state.docPlanId);
        loaded = { plan_id: p.plan_id, title: p.title, items: p.items };
      } else if (state.docPatient?.id) {
        // No specific plan chosen → show the patient's active plan (or newest).
        const list = await listPlans(state.docPatient.id);
        const pick = list.find((x) => x.status === 'ACTIVE') ?? list[0];
        if (pick) loaded = { plan_id: pick.plan_id, title: pick.title, items: pick.items };
      }
      setPlan(loaded);
    } catch (e) {
      setError(e);
      setPlan(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.docPlanId, state.docPatient?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEditor = (): void => {
    if (plan) setDocPlanId(plan.plan_id);
    setPlanEditorMode('edit');
    navigate('docEditTherapyPlan');
  };

  const items = [...(plan?.items ?? [])].sort((a, b) => a.sequence - b.sequence);
  const durations = items
    .map((i) => i.duration_minutes)
    .filter((n): n is number => n != null && n > 0);
  const dmin = durations.length ? Math.min(...durations) : 0;
  const dmax = durations.length ? Math.max(...durations) : 0;
  const practice = durations.length ? (dmin === dmax ? `${dmin}` : `${dmin}–${dmax}`) : '—';

  return (
    <DoctorShell showTabs={false}>
      <div className="doc-page tp-page">
        <button type="button" className="tp-back" onClick={() => navigate('docPatientDetail')}>
          <ArrowLeft size={18} aria-hidden="true" /> Back to Patient Profile
        </button>

        <div className="tp-head">
          <div>
            <h1 className="tp-title">Therapy Plan</h1>
            <p className="tp-sub">
              {plan ? plan.title : 'Personalized weekly exercise plan for the patient.'}
            </p>
          </div>
          <div className="tp-head__actions">
            <button type="button" className="doc-btn doc-btn--ghost" onClick={() => undefined}>
              <FileDown size={17} aria-hidden="true" /> Download PDF
            </button>
            <button
              type="button"
              className="doc-btn doc-btn--primary"
              onClick={openEditor}
              disabled={!plan}
            >
              <Pencil size={16} aria-hidden="true" /> Edit Plan
            </button>
          </div>
        </div>

        {loading ? (
          <p className="doc-empty">Loading plan…</p>
        ) : error ? (
          <DocError error={error} onRetry={() => void load()} />
        ) : !plan ? (
          <p className="doc-empty">No therapy plan yet for this patient.</p>
        ) : (
          <>
            <div className="tp-stats">
              <div className="tp-stat">
                <span className="tp-stat__icon tp-stat__icon--purple">
                  <Dumbbell size={20} aria-hidden="true" />
                </span>
                <div>
                  <span className="tp-stat__label">Total Exercises</span>
                  <span className="tp-stat__value">
                    {items.length} <small>Active</small>
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
                    {practice} <small>mins</small>
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
                  {items.map((item) => {
                    const name = exerciseLabel(item.exercise_type);
                    const icon = EXERCISE_ICON[name] ?? { Icon: BookOpen, tint: 'lilac' as Tint };
                    const isAi = name === 'Talk with Ollie';
                    return (
                      <tr key={item.item_id}>
                        <td>
                          <div className="tp-exname">
                            <span className={`tp-exicon tp-exicon--${icon.tint}`}>
                              <icon.Icon size={18} aria-hidden="true" />
                            </span>
                            <span className="tp-exname__label">{name}</span>
                            {isAi && <span className="tp-aibadge">AI</span>}
                          </div>
                        </td>
                        <td className="tp-days">{daysLabel(item)}</td>
                        <td className="tp-dur">
                          {item.duration_minutes != null ? `${item.duration_minutes} mins` : '—'}
                        </td>
                        <td>
                          <DifficultyCell item={item} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="tp-note">
              <Info size={17} aria-hidden="true" />
              This therapy plan has been personalized based on the child&apos;s speech assessment and
              will automatically evolve as the child progresses.
            </p>
          </>
        )}
      </div>
    </DoctorShell>
  );
}
