/**
 * PatientOverviewScreen — one patient's full clinical dashboard (desktop-only),
 * opened from "View Report" on the caseload.
 *
 * Two-column layout modelled on the product mockup, but wired to the REAL API:
 *   • Left rail  — Patient Details, Next Session, Treatment Plan.
 *   • Right pane — Weekly Goals ring + AI Clinical Summary, Performance
 *                  Breakdown, Game Recordings.
 *   • Below      — the richer clinical detail the endpoints expose (fluency
 *                  trend, disfluency mix, per-sound mastery, practice calendar).
 *
 * Data sources: GET /v1/doctor/patients/{id} (+/attempts) and GET /v1/plans
 * (?patient_id=…) for the Treatment Plan card. Fields the backend does NOT
 * expose (parent/guardian, contact, diagnosis date, session scheduling) are
 * rendered as clearly-marked "Not provided" placeholders — not invented values.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  AudioLines,
  BookOpen,
  BookText,
  Calendar,
  Download,
  Eye,
  Flame,
  Gamepad2,
  History,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Mic,
  Pause,
  Pencil,
  Play,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import {
  getAttemptRecording,
  getPatientDetail,
  getPatientReportPdf,
  listCaseload,
  listPatientAttempts,
  type AttemptSummary,
  type Metric,
  type PatientDetail,
} from '../api/doctorDashboard';
import { listPlans, type PlanListItem } from '../api/plans';
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

/** Up-to-two-letter initials for the avatar badge. */
const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

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

function Section({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className={`po-card${className ? ` ${className}` : ''}`}>
      <h2 className="po-card__title">{title}</h2>
      {children}
    </section>
  );
}

/* ---- Weekly Goals ring --------------------------------------------------- */

/** Pull goal numbers out of the loosely-typed adherence_this_week object. The
 *  backend's exact keys aren't pinned down, so we probe a few likely names and
 *  fall back to nulls (rendered as "—") when nothing usable is present. */
function readGoals(adherence: Record<string, unknown>): {
  pct: number | null;
  completed: number | null;
  target: number | null;
  streak: number | null;
} {
  const num = (...keys: string[]): number | null => {
    for (const k of keys) {
      const v = adherence[k];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
    }
    return null;
  };
  const completed = num('completed', 'completed_sessions', 'sessions_completed', 'done');
  const target = num('target', 'target_sessions', 'goal', 'goal_sessions', 'planned', 'total');
  const streak = num('streak', 'current_streak', 'streak_days', 'day_streak');
  let pct = num('adherence_pct', 'completion_pct', 'percent', 'pct', 'adherence');
  if (pct === null && completed !== null && target !== null && target > 0) {
    pct = (completed / target) * 100;
  }
  if (pct !== null) pct = Math.max(0, Math.min(100, pct));
  return { pct, completed, target, streak };
}

function Donut({ pct }: { pct: number | null }): JSX.Element {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const val = pct ?? 0;
  const offset = circumference * (1 - val / 100);
  return (
    <svg
      className="po-donut"
      viewBox="0 0 120 120"
      role="img"
      aria-label={pct === null ? 'No weekly goal data' : `${Math.round(val)} percent of weekly goal`}
    >
      <circle className="po-donut__track" cx="60" cy="60" r={r} />
      {pct !== null && (
        <circle
          className="po-donut__fill"
          cx="60"
          cy="60"
          r={r}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
      )}
      <text x="60" y="60" textAnchor="middle" dominantBaseline="central" className="po-donut__pct">
        {pct === null ? '—' : Math.round(val)}
        {pct !== null && <tspan className="po-donut__unit">%</tspan>}
      </text>
    </svg>
  );
}

function WeeklyGoalsCard({ detail }: { detail: PatientDetail }): JSX.Element {
  const goals = readGoals(detail.adherence_this_week ?? {});
  const completedLabel =
    goals.completed !== null && goals.target !== null
      ? `${goals.completed} / ${goals.target}`
      : goals.completed !== null
        ? String(goals.completed)
        : '—';
  return (
    <section className="po-card po-goals">
      <h2 className="po-card__title">Weekly Goals</h2>
      <div className="po-goals__ring">
        <Donut pct={goals.pct} />
      </div>
      <div className="po-goals__stats">
        <div>
          <span className="po-goals__k">Completed</span>
          <span className="po-goals__v">{completedLabel}</span>
        </div>
        <div>
          <span className="po-goals__k">Current Streak</span>
          <span className="po-goals__v po-goals__v--accent">
            <Flame size={16} aria-hidden="true" />
            {goals.streak !== null ? `${goals.streak} Days` : '—'}
          </span>
        </div>
      </div>
      {goals.pct === null && (
        <p className="po-goals__note">No adherence recorded for this week yet.</p>
      )}
    </section>
  );
}

/* ---- AI clinical summary (mock) ------------------------------------------ */

/**
 * MOCK AI clinical summaries — placeholder content until the real analysis API
 * lands. Each reads a couple of real fields (name, dominant disfluency) so it
 * reads patient-specific, but none of it is clinically meaningful. All 20 are
 * strengths-first, matching the product's encouraging tone. Swap for the live call.
 */
interface MockSummary {
  text: string;
  recommendation: string;
}
type SummaryTemplate = (first: string, dis: string) => MockSummary;

const SUMMARY_TEMPLATES: SummaryTemplate[] = [
  (first, dis) => ({
    text: `${first} is engaging consistently with articulation drills and shows clear gains in isolated-word accuracy. Connected speech is steadily catching up, with ${dis} now confined to phrase onsets rather than running through a whole utterance. Voice analysis shows reduced articulatory tension in medial-position sounds relative to the prior period.`,
    recommendation: 'Introduce phrase-level repetition and monitor carry-over into spontaneous speech over the next two weeks.',
  }),
  (first, dis) => ({
    text: `${first} has built an impressively steady practice habit, completing sessions without prompting. Easy-onset technique is landing well: ${dis} resolve quickly rather than escalating, which is the pattern we most want to see. Breath support through longer phrases is noticeably more even than at intake.`,
    recommendation: 'Extend target utterances by two to three words and keep reinforcing the self-correction that is already emerging.',
  }),
  (first, dis) => ({
    text: `${first} shows strong self-monitoring — noticing ${dis} in the moment and recovering without frustration. That awareness is a reliable predictor of carry-over, and it is arriving earlier than expected. Speech rate is settling into a more sustainable range across the session.`,
    recommendation: 'Begin light self-rating after each attempt to convert that awareness into an explicit, portable strategy.',
  }),
  (first, dis) => ({
    text: `${first} reads aloud with growing confidence and rarely abandons a phrase mid-way. ${titleCaseFirst(dis)} appear mostly on longer, less familiar words, while everyday vocabulary is now largely fluent. Prosody is more natural, with pausing that reads as intentional rather than stuck.`,
    recommendation: 'Move to unfamiliar passages to stretch the skill while keeping the current pacing strategy in place.',
  }),
  (first, dis) => ({
    text: `${first} is generalising well beyond drills: fluency in free conversation is closing the gap with structured tasks. ${titleCaseFirst(dis)} still surface under time pressure, but recovery is fast and the child continues talking. Engagement across activities remains high.`,
    recommendation: 'Add mild, playful time pressure in session so the recovery skill is rehearsed under realistic conditions.',
  }),
  (first, dis) => ({
    text: `${first} is producing longer, better-organised utterances than at baseline, with richer vocabulary in storytelling tasks. ${titleCaseFirst(dis)} have not increased even as sentence length grew — a strong sign the technique is holding under load. Voice quality stays relaxed through the session.`,
    recommendation: 'Keep lengthening narrative turns and watch that the relaxed onset survives the added complexity.',
  }),
  (first, dis) => ({
    text: `${first} arrives ready to practise and sustains attention through the full session. Light-contact articulation is well established, and ${dis} are shorter than in earlier recordings. Pacing is the emerging strength: phrase boundaries land where meaning suggests they should.`,
    recommendation: 'Introduce a short conversational partner task to test pacing when turn-taking adds unpredictability.',
  }),
  (first, dis) => ({
    text: `${first} demonstrates good breath support and rarely runs out of air mid-phrase now. ${titleCaseFirst(dis)} cluster at the start of a speaking turn, easing markedly once momentum builds. Overall stability across the session is improved on the prior period.`,
    recommendation: 'Rehearse turn-initiation specifically — a short pre-phrase breath before the first word is likely to pay off.',
  }),
  (first, dis) => ({
    text: `${first} responds very well to modelling and imitates target patterns accurately on the first or second attempt. ${titleCaseFirst(dis)} reduce sharply in repetition tasks, showing the motor plan is available. The next step is retrieving it without a model present.`,
    recommendation: 'Fade the model gradually — delayed imitation, then spontaneous production of the same targets.',
  }),
  (first, dis) => ({
    text: `${first} keeps talking through moments of difficulty rather than avoiding words, which is exactly the resilience we look for. ${titleCaseFirst(dis)} occur but no longer derail the utterance, and word substitution has dropped. Confidence in conversation is visibly higher.`,
    recommendation: 'Reinforce the approach behaviour explicitly and continue expanding conversational topics.',
  }),
  (first, dis) => ({
    text: `${first} is showing steadier rate control, with fewer rushed passages than earlier recordings. ${titleCaseFirst(dis)} correlate with speeding up, so the link between rate and fluency is becoming clear and usable. Articulation stays precise at the slower rate.`,
    recommendation: 'Make rate the explicit target for the next fortnight; the fluency gains appear to follow from it.',
  }),
  (first, dis) => ({
    text: `${first} sustains fluent stretches for noticeably longer before any interruption. ${titleCaseFirst(dis)} are now isolated events rather than clusters, which points to genuine consolidation rather than a good day. Session-to-session variability has narrowed.`,
    recommendation: 'Hold the current programme — consistency is doing the work; avoid changing too many variables at once.',
  }),
  (first, dis) => ({
    text: `${first} carries technique into playful, unstructured talk, which is often the hardest transfer to achieve. ${titleCaseFirst(dis)} rise slightly when excited, as expected, but settle without adult prompting. Emotional tone throughout practice is positive.`,
    recommendation: 'Deliberately practise during high-arousal, exciting topics so the strategy is robust when it matters most.',
  }),
  (first, dis) => ({
    text: `${first} produces clear, well-differentiated target sounds and is easily understood by an unfamiliar listener. ${titleCaseFirst(dis)} affect flow more than intelligibility, so comprehension is already strong. Voice analysis shows relaxed phonation with no strain markers.`,
    recommendation: 'Shift emphasis from clarity to flow — intelligibility is secured and no longer needs session time.',
  }),
  (first, dis) => ({
    text: `${first} is markedly more willing to initiate conversation than at intake, volunteering rather than only answering. ${titleCaseFirst(dis)} have not risen with the extra talking, so the increased output is not costing fluency. Practice adherence is excellent.`,
    recommendation: 'Encourage more initiated turns at home; the extra speaking time appears to be helping rather than hurting.',
  }),
  (first, dis) => ({
    text: `${first} uses pausing effectively, giving time to plan the next phrase instead of pushing through. ${titleCaseFirst(dis)} drop noticeably when pauses are well placed, and the pauses now sound natural. This is a mature strategy to see this early.`,
    recommendation: 'Formalise the pausing strategy so it is deliberate and available under pressure, not just incidental.',
  }),
  (first, dis) => ({
    text: `${first} performs consistently across all exercise types, with no single activity lagging behind. ${titleCaseFirst(dis)} appear at a stable, low rate regardless of task, suggesting a solid and even foundation. Attention holds to the end of each session.`,
    recommendation: 'Increase difficulty across the board — the even profile suggests capacity for a broader step up.',
  }),
  (first, dis) => ({
    text: `${first} recovers from ${dis} within a syllable or two and returns to fluent speech without visible tension. Struggle behaviour and secondary movements are minimal, which is a very favourable prognostic sign. The child's attitude toward practice remains upbeat.`,
    recommendation: 'Keep the low-pressure framing that is clearly working; protect it as tasks get harder.',
  }),
  (first, dis) => ({
    text: `${first} is showing gains that hold between sessions rather than resetting, indicating real consolidation. ${titleCaseFirst(dis)} at the start of each session now resolve faster than they did previously. Warm-up time needed before fluent speech has shortened.`,
    recommendation: 'Trim the warm-up and reinvest that time in connected-speech practice.',
  }),
  (first, dis) => ({
    text: `${first} handles longer, more complex sentences without a corresponding rise in ${dis} — the technique is scaling with linguistic load. Comprehension and expression are well matched, and storytelling is becoming a genuine strength. Overall trajectory is positive.`,
    recommendation: 'Progress to multi-sentence narratives and begin planning for reduced session frequency.',
  }),
];

/** "prolongation events" → "Prolongation events" (for sentence-initial use). */
function titleCaseFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Stable fallback index when the peer list is unavailable (deep link, failed call). */
function hashIndex(id: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % mod;
}

/**
 * Pick this patient's summary. `peerIds` is every patient this doctor has, sorted
 * — so each one lands on a different template and no two patients read alike
 * (up to the 20 available; beyond that it necessarily wraps). Falls back to a
 * hash of the id when the peer list didn't load.
 */
function buildMockSummary(detail: PatientDetail, patientId: string, peerIds: string[]): MockSummary {
  const first = detail.name?.trim().split(/\s+/)[0] || 'This patient';
  const dis = detail.dominant_disfluency
    ? `${titleCase(detail.dominant_disfluency).toLowerCase()} events`
    : 'occasional disfluencies';
  const rank = peerIds.indexOf(patientId);
  const i = (rank >= 0 ? rank : hashIndex(patientId, SUMMARY_TEMPLATES.length)) % SUMMARY_TEMPLATES.length;
  return SUMMARY_TEMPLATES[i](first, dis);
}

function AiSummaryCard({
  detail,
  patientId,
  peerIds,
}: {
  detail: PatientDetail;
  patientId: string;
  peerIds: string[];
}): JSX.Element {
  const s = buildMockSummary(detail, patientId, peerIds);
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

/* ---- Game recordings ----------------------------------------------------- */

/** Map a raw exercise_type onto a friendly label + icon for the recordings list.
 *  `light` picks the softer icon chip to echo the mockup's alternating tiles. */
function gameMeta(type?: string | null): { label: string; icon: JSX.Element; light: boolean } {
  const t = (type ?? '').toUpperCase();
  if (t.includes('REPEAT')) return { label: 'Repeat after me', icon: <Gamepad2 size={18} />, light: false };
  if (t.includes('OLLIE') || t.includes('TALK') || t.includes('CONVERSE') || t.includes('CHAT'))
    return { label: 'Converse with Ollie', icon: <MessageSquare size={18} />, light: true };
  if (t.includes('READ')) return { label: 'Read-it-Loud', icon: <BookOpen size={18} />, light: false };
  if (t.includes('PICTURE')) return { label: 'Picture-Talk', icon: <ImageIcon size={18} />, light: true };
  if (t.includes('STORY')) return { label: 'Story-Teller', icon: <BookText size={18} />, light: false };
  return { label: type ? titleCase(type) : 'Practice', icon: <Mic size={18} />, light: false };
}

/** Game Recordings list with inline playback. Clicking a row fetches a FRESH
 *  presigned S3 URL from the backend (GET /v1/doctor/attempts/{id}/recording) and
 *  plays it through a shared hidden <audio>. We sign on demand because the URL
 *  stored on the attempt expires; clicking the active row toggles play/pause. */
function RecordingsList({ attempts }: { attempts: AttemptSummary[] }): JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const onPlayClick = useCallback(
    async (attemptId: string): Promise<void> => {
      const audio = audioRef.current;
      if (!audio) return;
      setErrorId(null);
      // Same row → toggle the already-loaded audio.
      if (activeId === attemptId) {
        if (audio.paused) void audio.play().catch(() => setErrorId(attemptId));
        else audio.pause();
        return;
      }
      // New row → fetch a fresh presigned URL, then play.
      setLoadingId(attemptId);
      try {
        const { audio_url } = await getAttemptRecording(attemptId);
        audio.src = audio_url;
        setActiveId(attemptId);
        await audio.play();
      } catch {
        setActiveId(null);
        setErrorId(attemptId);
      } finally {
        setLoadingId(null);
      }
    },
    [activeId],
  );

  return (
    <>
      {/* One shared player for the whole list. */}
      <audio
        ref={audioRef}
        hidden
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <ul className="po-recs">
        {attempts.map((a) => {
          const g = gameMeta(a.exercise_type);
          const isActive = activeId === a.attempt_id;
          const isLoading = loadingId === a.attempt_id;
          const isPlaying = isActive && playing;
          return (
            <li key={a.attempt_id} className="po-rec">
              <span className={`po-rec__icon${g.light ? ' po-rec__icon--light' : ''}`}>{g.icon}</span>
              <span className="po-rec__body">
                <span className="po-rec__name">{g.label}</span>
                <span className="po-rec__date">
                  {new Date(a.created_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="po-rec__scores">
                  Fluency {fmt(a.fluency_score, 1)} · Stutter {fmt(a.stutter_frequency_percent, 1)}% ·{' '}
                  {fmt(a.words_per_minute, 0)} wpm
                </span>
                {errorId === a.attempt_id && (
                  <span className="po-rec__err">Recording unavailable</span>
                )}
              </span>
              <button
                type="button"
                className="po-rec__btn"
                onClick={() => void onPlayClick(a.attempt_id)}
                disabled={isLoading}
                aria-label={isPlaying ? 'Pause recording' : 'Play recording'}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="po-spin" size={15} aria-hidden="true" /> Loading…
                  </>
                ) : isPlaying ? (
                  <>
                    <Pause size={15} aria-hidden="true" /> Pause
                  </>
                ) : (
                  <>
                    <Play size={15} aria-hidden="true" /> Play recording
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/* ---- Left rail cards ----------------------------------------------------- */

function PatientDetailsCard({ detail }: { detail: PatientDetail }): JSX.Element {
  // Real fields the API exposes vs. mockup fields it does not (placeholders).
  const rows: { k: string; v: ReactNode; empty?: boolean; mono?: boolean }[] = [
    { k: 'Parent/Guardian', v: 'Not provided', empty: true },
    { k: 'Contact', v: 'Not provided', empty: true },
    {
      k: 'Diagnosis',
      v: detail.dominant_disfluency ? titleCase(detail.dominant_disfluency) : 'Not provided',
      empty: !detail.dominant_disfluency,
    },
    { k: 'Diagnosis Date', v: 'Not provided', empty: true },
    { k: 'Primary Therapist', v: 'Not provided', empty: true },
    { k: 'Patient ID', v: detail.patient_id, mono: true },
  ];
  return (
    <section className="po-card po-details">
      <div className="po-details__head">
        <span className="po-avatar">{initials(detail.name)}</span>
        <h2 className="po-card__title po-details__title">Patient Details</h2>
      </div>
      <dl className="po-dl">
        {rows.map((r) => (
          <div key={r.k}>
            <dt>{r.k}</dt>
            <dd className={`${r.empty ? 'po-dd--empty' : ''}${r.mono ? ' po-mono' : ''}`.trim()}>{r.v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function NextSessionCard(): JSX.Element {
  return (
    <section className="po-card po-next">
      <h2 className="po-card__title">Next Session</h2>
      <div className="po-next__empty">
        <span className="po-next__icon">
          <Calendar size={22} aria-hidden="true" />
        </span>
        <p className="po-next__lead">No upcoming session scheduled.</p>
        <p className="po-next__note">Session scheduling isn’t available from the API yet.</p>
      </div>
      <button type="button" className="doc-btn doc-btn--ghost po-full" onClick={() => undefined}>
        Schedule Session
      </button>
    </section>
  );
}

function TreatmentPlanCard({
  plan,
  onShow,
  onEdit,
  onAdd,
}: {
  plan: PlanListItem | null;
  onShow: () => void;
  onEdit: () => void;
  onAdd: () => void;
}): JSX.Element {
  const statusLabel = plan
    ? plan.status === 'ACTIVE'
      ? 'Active Plan'
      : `${titleCase(plan.status.toLowerCase())} Plan`
    : null;
  return (
    <section className="po-card po-plan">
      <h2 className="po-card__title">Treatment Plan</h2>
      <div className="po-plan__status">
        <span className="po-plan__k">Current Status</span>
        <span className="po-plan__v">{plan ? `${statusLabel}: ${plan.title}` : 'No plan yet'}</span>
      </div>
      <div className="po-plan__btns">
        <button type="button" className="doc-btn doc-btn--ghost" onClick={onShow} disabled={!plan}>
          <Eye size={16} aria-hidden="true" /> Show Plan
        </button>
        <button type="button" className="doc-btn doc-btn--ghost" onClick={onEdit} disabled={!plan}>
          <Pencil size={16} aria-hidden="true" /> Edit Plan
        </button>
      </div>
      <button type="button" className="doc-btn doc-btn--primary po-full" onClick={onAdd}>
        <Plus size={16} aria-hidden="true" /> Add New Plan
      </button>
    </section>
  );
}

/* ---- Body ---------------------------------------------------------------- */

function OverviewBody({
  detail,
  attempts,
  plan,
  peerIds,
  onShowPlan,
  onEditPlan,
  onAddPlan,
}: {
  detail: PatientDetail;
  attempts: AttemptSummary[];
  plan: PlanListItem | null;
  peerIds: string[];
  onShowPlan: () => void;
  onEditPlan: () => void;
  onAddPlan: () => void;
}): JSX.Element {
  const disfluency = detail.disfluency_breakdown ?? {};
  const disfluencyMax = Math.max(1, ...Object.values(disfluency).map((v) => Number(v) || 0));
  const context = detail.context_comparison ?? [];
  const perSound = detail.per_sound ?? [];
  const trend = detail.fluency_trend ?? [];
  const calendar = detail.practice_calendar ?? [];
  const calMax = Math.max(1, ...calendar.map((d) => d.completed));

  // Performance Breakdown: prefer real per-context fluency; otherwise fall back
  // to the headline metrics we do have (never invented Pronunciation/etc.).
  const perf: { label: string; value: number }[] = context.length
    ? context.map((c) => ({ label: titleCase(c.exercise_type), value: c.avg_fluency ?? 0 }))
    : [
        { label: 'Fluency', value: detail.fluency?.value ?? null },
        {
          label: 'Stutter-free',
          value:
            detail.stutter_frequency?.value != null ? 100 - detail.stutter_frequency.value : null,
        },
      ].filter((p): p is { label: string; value: number } => p.value != null);
  const perfMax = Math.max(100, ...perf.map((p) => p.value));

  return (
    <>
      <div className="po-layout">
        {/* ---- Left rail ---- */}
        <aside className="po-side">
          <PatientDetailsCard detail={detail} />
          <NextSessionCard />
          <TreatmentPlanCard plan={plan} onShow={onShowPlan} onEdit={onEditPlan} onAdd={onAddPlan} />
        </aside>

        {/* ---- Main pane ---- */}
        <div className="po-main">
          {/* Headline metrics */}
          <div className="po-stats">
            <StatCard label="Fluency" metric={detail.fluency} />
            <StatCard label="Stutter Frequency" metric={detail.stutter_frequency} unit="%" />
            <StatCard label="Words / Min" metric={detail.words_per_minute} digits={0} />
          </div>

          {/* Weekly goals ring + AI summary */}
          <div className="po-toprow">
            <WeeklyGoalsCard detail={detail} />
            <AiSummaryCard detail={detail} patientId={detail.patient_id} peerIds={peerIds} />
          </div>

          {/* Performance breakdown */}
          <Section title="Performance Breakdown">
            {perf.length > 0 ? (
              <div className="po-bars">
                {perf.map((p) => (
                  <Bar
                    key={p.label}
                    value={p.value}
                    max={perfMax}
                    label={p.label}
                    sub={`${fmt(p.value, 0)}%`}
                  />
                ))}
              </div>
            ) : (
              <p className="po-muted">No performance data recorded yet.</p>
            )}
          </Section>

          {/* Game recordings / attempts */}
          <Section title="Game Recordings">
            {attempts.length === 0 ? (
              <p className="po-muted">No recorded attempts yet.</p>
            ) : (
              <RecordingsList attempts={attempts} />
            )}
          </Section>
        </div>
      </div>

      {/* ---- Richer clinical detail (all real API data) ---- */}
      {(trend.length > 0 ||
        Object.keys(disfluency).length > 0 ||
        perSound.length > 0 ||
        calendar.length > 0) && (
        <div className="po-extras">
          {trend.length > 0 && (
            <Section title="Fluency Trend (weekly)">
              <div className="po-bars">
                {trend.map((w) => (
                  <Bar
                    key={w.week_start}
                    value={w.avg_fluency ?? 0}
                    max={Math.max(1, ...trend.map((t) => t.avg_fluency ?? 0))}
                    label={new Date(w.week_start).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                    sub={`${fmt(w.avg_fluency, 1)} • ${w.attempts} att`}
                  />
                ))}
              </div>
            </Section>
          )}

          {Object.keys(disfluency).length > 0 && (
            <Section title="Disfluency Breakdown">
              <div className="po-bars">
                {Object.entries(disfluency).map(([k, v]) => (
                  <Bar key={k} value={Number(v) || 0} max={disfluencyMax} label={titleCase(k)} sub={String(v)} />
                ))}
              </div>
            </Section>
          )}

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
        </div>
      )}
    </>
  );
}

export function PatientOverviewScreen(): JSX.Element {
  const { state, navigate, setPlanEditorMode, setDocPlanId } = useApp();
  const selected = state.docPatient;
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [plan, setPlan] = useState<PlanListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [exporting, setExporting] = useState(false);
  /** Every patient of this doctor, id-sorted — gives each a distinct mock summary. */
  const [peerIds, setPeerIds] = useState<string[]>([]);

  const load = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      // Detail is required; the rest are best-effort (don't fail the page).
      const [d, a, plans, caseload] = await Promise.all([
        getPatientDetail(id),
        listPatientAttempts(id, 10).catch(() => ({ attempts: [], total: 0 })),
        listPlans(id).catch(() => [] as PlanListItem[]),
        listCaseload().catch(() => ({ patients: [] })),
      ]);
      setDetail(d);
      setAttempts(a.attempts ?? []);
      // Sorted by id so the order is canonical — independent of how the patient
      // list happens to be sorted on screen, and stable across reloads.
      setPeerIds((caseload.patients ?? []).map((p) => p.patient_id).sort());
      // Surface the active plan; else the most recent draft/other as "current".
      setPlan(plans.find((p) => p.status === 'ACTIVE') ?? plans[0] ?? null);
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

  // Download the patient progress report PDF (generated by the backend). Binary,
  // so it's fetched as a blob and saved via a temporary object URL.
  const handleExportReport = useCallback(async (): Promise<void> => {
    if (!selected?.id || exporting) return;
    setExporting(true);
    try {
      const blob = await getPatientReportPdf(selected.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug = (selected.name ?? selected.id).trim().replace(/\s+/g, '-').toLowerCase();
      a.href = url;
      a.download = `report-${slug}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert('Sorry, the report could not be generated. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [selected?.id, selected?.name, exporting]);

  const showPlan = useCallback((): void => {
    if (!plan) return;
    setDocPlanId(plan.plan_id);
    navigate('docTherapyPlan');
  }, [plan, setDocPlanId, navigate]);

  const editPlan = useCallback((): void => {
    if (!plan) return;
    setPlanEditorMode('edit');
    setDocPlanId(plan.plan_id);
    navigate('docEditTherapyPlan');
  }, [plan, setPlanEditorMode, setDocPlanId, navigate]);

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
            <button
              type="button"
              className="doc-btn doc-btn--ghost"
              onClick={() => void handleExportReport()}
              disabled={!selected?.id || exporting}
            >
              <Download size={16} aria-hidden="true" /> {exporting ? 'Preparing…' : 'Export Report'}
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
          <OverviewBody
            detail={detail}
            attempts={attempts}
            plan={plan}
            peerIds={peerIds}
            onShowPlan={showPlan}
            onEditPlan={editPlan}
            onAddPlan={() => setShowAddPlan(true)}
          />
        ) : null}

        {showAddPlan && (
          <AddNewPlanModal
            onClose={() => setShowAddPlan(false)}
            onChooseExisting={() => navigate('docPlanTemplates')}
            onCustomize={() => {
              setDocPlanId(null);
              setPlanEditorMode('create');
              navigate('docEditTherapyPlan');
            }}
          />
        )}
      </div>
    </DoctorShell>
  );
}
