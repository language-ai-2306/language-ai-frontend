/**
 * PatientOverviewScreen — one patient's full clinical dashboard (desktop-only),
 * opened from "View Report" on the caseload.
 *
 * Adapted to the REAL API (not the original mockup): it renders exactly what
 * GET /v1/doctor/patients/{id} and .../attempts return — the three headline
 * metrics with week/baseline deltas, fluency trend, per-context and per-sound
 * breakdowns, disfluency mix, weekly adherence, a practice calendar, and the
 * recorded attempts. Every field the endpoints expose is surfaced here.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  AudioLines,
  Download,
  History,
  Pencil,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import {
  getPatientDetail,
  listPatientAttempts,
  type AttemptSummary,
  type Metric,
  type PatientDetail,
} from '../api/doctorDashboard';
import { useApp } from '../store/AppStore';
import { AddNewPlanModal } from './AddNewPlanModal';
import { DoctorShell } from './DoctorShell';
import { DocError } from './DocError';
import './patient-overview.css';

/** Format a possibly-null number to a fixed precision, or an em dash. */
const fmt = (v?: number | null, digits = 0): string =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : v.toFixed(digits);

const titleCase = (s: string): string =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** A signed change vs a reference, with a directional arrow (neutral colour — a
 *  rise isn't universally good/bad across metrics). */
function Delta({ value, label }: { value?: number | null; label: string }): JSX.Element | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const up = value >= 0;
  return (
    <span className="po-delta">
      {up ? <TrendingUp size={13} aria-hidden="true" /> : <TrendingDown size={13} aria-hidden="true" />}
      {up ? '+' : ''}
      {value.toFixed(1)} <span className="po-delta__label">{label}</span>
    </span>
  );
}

function StatCard({
  label,
  metric,
  unit,
  digits = 1,
}: {
  label: string;
  metric: Metric;
  unit?: string;
  digits?: number;
}): JSX.Element {
  return (
    <div className="po-stat">
      <span className="po-stat__label">{label}</span>
      <span className="po-stat__value">
        {fmt(metric?.value, digits)}
        {unit && metric?.value != null && <small>{unit}</small>}
      </span>
      <div className="po-stat__deltas">
        <Delta value={metric?.vs_last_week} label="vs last week" />
        <Delta value={metric?.vs_baseline} label="vs baseline" />
      </div>
    </div>
  );
}

/** A labelled proportional bar, scaled to the max value in its group. */
function Bar({ value, max, label, sub }: { value: number; max: number; label: string; sub?: string }): JSX.Element {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="po-bar">
      <div className="po-bar__top">
        <span className="po-bar__label">{label}</span>
        <span className="po-bar__val">{sub ?? value}</span>
      </div>
      <div className="po-bar__track">
        <span className="po-bar__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section className="po-card">
      <h2 className="po-card__title">{title}</h2>
      {children}
    </section>
  );
}

/**
 * MOCK AI clinical summary — placeholder content until the real analysis API
 * lands. It reads a couple of real fields (name, dominant disfluency) so it reads
 * patient-specific, but it is NOT clinically meaningful. Swap for the live call.
 */
function buildMockSummary(detail: PatientDetail): { text: string; recommendation: string } {
  const first = detail.name?.trim().split(/\s+/)[0] || 'This patient';
  const dis = detail.dominant_disfluency
    ? `${titleCase(detail.dominant_disfluency).toLowerCase()} events`
    : 'occasional disfluencies';
  return {
    text: `${first} is engaging consistently with articulation drills and shows early gains in isolated-word accuracy. Connected-speech fluency remains variable, with intermittent ${dis} on phrase onsets. Voice analysis indicates reduced articulatory tension in medial-position sounds relative to the prior period.`,
    recommendation:
      'Recommend introducing phrase-level repetition exercises and monitoring carry-over into spontaneous speech over the next two weeks.',
  };
}

function AiSummaryCard({ detail }: { detail: PatientDetail }): JSX.Element {
  const s = buildMockSummary(detail);
  return (
    <section className="po-ai">
      <div className="po-ai__head">
        <h2 className="po-ai__title">
          <Sparkles size={18} aria-hidden="true" /> AI Clinical Summary
        </h2>
        <span className="po-ai__tag">Sample</span>
      </div>
      <p className="po-ai__text">{s.text}</p>
      <p className="po-ai__rec">{s.recommendation}</p>
      <div className="po-ai__chips">
        <span className="po-ai__chip">
          <AudioLines size={13} aria-hidden="true" /> Voice Analysis
        </span>
        <span className="po-ai__chip">
          <History size={13} aria-hidden="true" /> History Ref
        </span>
      </div>
      <p className="po-ai__note">Sample insight — live AI analysis coming soon.</p>
    </section>
  );
}

function OverviewBody({
  detail,
  attempts,
}: {
  detail: PatientDetail;
  attempts: AttemptSummary[];
}): JSX.Element {
  const disfluency = detail.disfluency_breakdown ?? {};
  const disfluencyMax = Math.max(1, ...Object.values(disfluency).map((v) => Number(v) || 0));
  const context = detail.context_comparison ?? [];
  const contextMax = Math.max(1, ...context.map((c) => c.avg_fluency ?? 0));
  const perSound = detail.per_sound ?? [];
  const trend = detail.fluency_trend ?? [];
  const calendar = detail.practice_calendar ?? [];
  const calMax = Math.max(1, ...calendar.map((d) => d.completed));
  const adherence = detail.adherence_this_week ?? {};

  return (
    <div className="po-grid">
      {/* Headline metrics */}
      <div className="po-stats">
        <StatCard label="Fluency" metric={detail.fluency} />
        <StatCard label="Stutter Frequency" metric={detail.stutter_frequency} unit="%" />
        <StatCard label="Words / Min" metric={detail.words_per_minute} digits={0} />
      </div>

      {/* AI clinical summary — mock content for now (real analysis API later). */}
      <AiSummaryCard detail={detail} />

      {/* Patient details */}
      <Section title="Patient Details">
        <dl className="po-dl">
          <div>
            <dt>Patient ID</dt>
            <dd className="po-mono">{detail.patient_id}</dd>
          </div>
          <div>
            <dt>Age</dt>
            <dd>{detail.age ?? '—'}</dd>
          </div>
          <div>
            <dt>Dominant Disfluency</dt>
            <dd>{detail.dominant_disfluency ? titleCase(detail.dominant_disfluency) : '—'}</dd>
          </div>
          <div>
            <dt>Active Plans</dt>
            <dd>
              {detail.active_plans && detail.active_plans.length > 0 ? (
                <span className="po-chips">
                  {detail.active_plans.map((p) => (
                    <span key={p} className="po-chip">
                      {p}
                    </span>
                  ))}
                </span>
              ) : (
                'None'
              )}
            </dd>
          </div>
        </dl>
      </Section>

      {/* Fluency trend */}
      {trend.length > 0 && (
        <Section title="Fluency Trend (weekly)">
          <div className="po-bars">
            {trend.map((w) => (
              <Bar
                key={w.week_start}
                value={w.avg_fluency ?? 0}
                max={Math.max(1, ...trend.map((t) => t.avg_fluency ?? 0))}
                label={new Date(w.week_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                sub={`${fmt(w.avg_fluency, 1)} • ${w.attempts} att`}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Performance by exercise context */}
      {context.length > 0 && (
        <Section title="Performance by Context">
          <div className="po-bars">
            {context.map((c) => (
              <Bar
                key={c.exercise_type}
                value={c.avg_fluency ?? 0}
                max={contextMax}
                label={titleCase(c.exercise_type)}
                sub={`${fmt(c.avg_fluency, 1)} fl • ${c.attempts} att`}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Disfluency breakdown */}
      {Object.keys(disfluency).length > 0 && (
        <Section title="Disfluency Breakdown">
          <div className="po-bars">
            {Object.entries(disfluency).map(([k, v]) => (
              <Bar key={k} value={Number(v) || 0} max={disfluencyMax} label={titleCase(k)} sub={String(v)} />
            ))}
          </div>
        </Section>
      )}

      {/* Per-sound mastery */}
      {perSound.length > 0 && (
        <Section title="Per-Sound Mastery">
          <div className="po-table-wrap">
            <table className="po-table">
              <thead>
                <tr>
                  <th>Sound</th>
                  <th>Difficulty</th>
                  <th>Mastery</th>
                  <th>Rolling SS</th>
                  <th>Attempts</th>
                </tr>
              </thead>
              <tbody>
                {perSound.map((s) => (
                  <tr key={s.target_phoneme}>
                    <td className="po-mono">{s.target_phoneme}</td>
                    <td>{s.current_difficulty ? titleCase(s.current_difficulty) : '—'}</td>
                    <td>{s.mastery_level ? titleCase(s.mastery_level) : '—'}</td>
                    <td>{fmt(s.rolling_ss, 1)}</td>
                    <td>{s.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Weekly adherence */}
      {Object.keys(adherence).length > 0 && (
        <Section title="Adherence This Week">
          <dl className="po-dl po-dl--wide">
            {Object.entries(adherence).map(([k, v]) => (
              <div key={k}>
                <dt>{titleCase(k)}</dt>
                <dd>
                  {v === null || v === undefined || v === ''
                    ? '—'
                    : typeof v === 'object'
                      ? JSON.stringify(v)
                      : String(v)}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {/* Practice calendar */}
      {calendar.length > 0 && (
        <Section title="Practice Calendar">
          <div className="po-cal">
            {calendar.map((d) => (
              <div key={d.date} className="po-cal__cell" title={`${d.date}: ${d.completed} completed`}>
                <span
                  className="po-cal__dot"
                  style={{ opacity: 0.25 + 0.75 * (d.completed / calMax) }}
                />
                <span className="po-cal__day">
                  {new Date(d.date).toLocaleDateString(undefined, { day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Game recordings / attempts */}
      <Section title="Game Recordings">
        {attempts.length === 0 ? (
          <p className="po-muted">No recorded attempts yet.</p>
        ) : (
          <ul className="po-attempts">
            {attempts.map((a) => (
              <li key={a.attempt_id} className="po-attempt">
                <div className="po-attempt__main">
                  <span className="po-attempt__type">
                    {a.exercise_type ? titleCase(a.exercise_type) : 'Attempt'}
                  </span>
                  <span className="po-attempt__date">
                    {new Date(a.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="po-attempt__scores">
                  <span>Fluency {fmt(a.fluency_score, 1)}</span>
                  <span>Stutter {fmt(a.stutter_frequency_percent, 1)}%</span>
                  <span>{fmt(a.words_per_minute, 0)} wpm</span>
                  {a.dominant_disfluency && <span>{titleCase(a.dominant_disfluency)}</span>}
                </div>
                <button type="button" className="po-attempt__btn" onClick={() => undefined}>
                  Check Recording
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

export function PatientOverviewScreen(): JSX.Element {
  const { state, navigate, setPlanEditorMode } = useApp();
  const selected = state.docPatient;
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [showAddPlan, setShowAddPlan] = useState(false);

  const load = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      // Detail is required; attempts are best-effort (don't fail the page).
      const [d, a] = await Promise.all([
        getPatientDetail(id),
        listPatientAttempts(id, 10).catch(() => ({ attempts: [], total: 0 })),
      ]);
      setDetail(d);
      setAttempts(a.attempts ?? []);
    } catch (e) {
      setError(e);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected?.id) void load(selected.id);
    else setLoading(false);
  }, [selected?.id, load]);

  const headerName = detail?.name ?? selected?.name ?? 'Patient';
  const subtitle = detail
    ? [detail.age ? `${detail.age} yrs` : null, detail.dominant_disfluency ? titleCase(detail.dominant_disfluency) : null]
        .filter(Boolean)
        .join(' • ')
    : '';

  return (
    <DoctorShell active="patients">
      <div className="doc-page">
        <div className="po-head">
          <div className="po-head__left">
            <button
              type="button"
              className="po-back"
              onClick={() => navigate('docPatients')}
              aria-label="Back to all patients"
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <div>
              <h1 className="po-name">
                {headerName}
                {detail && <span className="po-badge">ACTIVE</span>}
              </h1>
              {subtitle && <p className="po-sub">{subtitle}</p>}
            </div>
          </div>
          <div className="po-head__actions">
            <button type="button" className="doc-btn doc-btn--ghost" onClick={() => undefined}>
              <Pencil size={16} aria-hidden="true" /> Edit Profile
            </button>
            <button type="button" className="doc-btn doc-btn--ghost" onClick={() => undefined}>
              <Download size={16} aria-hidden="true" /> Export Report
            </button>
            <button
              type="button"
              className="doc-btn doc-btn--primary"
              onClick={() => setShowAddPlan(true)}
            >
              <Plus size={16} aria-hidden="true" /> Add New Plan
            </button>
          </div>
        </div>

        {!selected ? (
          <div className="doc-notice">
            <p>No patient selected.</p>
            <button type="button" className="doc-btn doc-btn--primary" onClick={() => navigate('docPatients')}>
              Back to patients
            </button>
          </div>
        ) : loading ? (
          <p className="doc-empty">Loading patient…</p>
        ) : error ? (
          <DocError error={error} onRetry={() => selected.id && void load(selected.id)} />
        ) : detail ? (
          <OverviewBody detail={detail} attempts={attempts} />
        ) : null}

        {showAddPlan && (
          <AddNewPlanModal
            onClose={() => setShowAddPlan(false)}
            onChooseExisting={() => navigate('docPlanTemplates')}
            onCustomize={() => {
              setPlanEditorMode('create');
              navigate('docEditTherapyPlan');
            }}
          />
        )}
      </div>
    </DoctorShell>
  );
}
