/**
 * PlansScreen — the doctor's "Plans" tab (desktop-only). Lists every treatment
 * plan from GET /v1/plans, each with its exercise items expanded. An optional
 * status filter narrows the list (the API supports ?status=…). Requires a doctor
 * bearer token; previewing without login shows an auth notice.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarRange, Check, ChevronDown, Eye, ListChecks, Plus } from 'lucide-react';

import { ApiError } from '../api/client';
import {
  listPlans,
  updatePlan,
  type PlanItem,
  type PlanListItem,
  type PlanStatus,
} from '../api/plans';
import { useApp } from '../store/AppStore';
import { DoctorShell } from './DoctorShell';
import { DocError } from './DocError';
import './plans.css';

const ALL_STATUSES: PlanStatus[] = ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'];
/** Final/locking transitions that warrant a confirm before applying. */
const CONFIRM: Partial<Record<PlanStatus, { title: string; body: string; cta: string }>> = {
  COMPLETED: {
    title: 'Mark plan as completed?',
    body: 'This closes the plan out. You can reopen it later by setting it back to Active.',
    cta: 'Mark completed',
  },
  ARCHIVED: {
    title: 'Archive this plan?',
    body: 'It will be moved out of the active workflow. You can restore it later by changing its status.',
    cta: 'Archive plan',
  },
};

const STATUS_FILTERS: Array<{ value: PlanStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const titleCase = (s: string): string =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Render an opaque object (schedule/dosage/advancement) as compact chips. */
function ObjectChips({ label, obj }: { label: string; obj: Record<string, unknown> }): JSX.Element | null {
  const entries = Object.entries(obj ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (entries.length === 0) return null;
  return (
    <div className="pl-meta">
      <span className="pl-meta__label">{label}</span>
      {entries.map(([k, v]) => (
        <span key={k} className="pl-meta__chip">
          {titleCase(k)}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
        </span>
      ))}
    </div>
  );
}

function ItemRow({ item }: { item: PlanItem }): JSX.Element {
  return (
    <li className="pl-item">
      <span className="pl-item__seq">{item.sequence}</span>
      <div className="pl-item__body">
        <div className="pl-item__top">
          <span className="pl-item__type">{titleCase(item.exercise_type)}</span>
          {item.target_phoneme && <span className="pl-tag pl-tag--phoneme">/{item.target_phoneme}/</span>}
          {item.difficulty && <span className="pl-tag">{titleCase(item.difficulty)}</span>}
          <span className={`pl-istatus pl-istatus--${item.status.toLowerCase()}`}>
            {titleCase(item.status)}
          </span>
        </div>
        <div className="pl-item__facts">
          <span>{item.frequency}</span>
          {item.duration_minutes != null && <span>{item.duration_minutes} min</span>}
        </div>
        <ObjectChips label="Dosage" obj={item.dosage} />
        <ObjectChips label="Schedule" obj={item.schedule} />
        <ObjectChips label="Advancement" obj={item.advancement} />
      </div>
    </li>
  );
}

/** The plan's status pill, turned into an inline editor: pick a new status to
 *  PATCH it. Final states (Completed/Archived) ask to confirm first. */
function PlanStatusControl({
  plan,
  onChanged,
}: {
  plan: PlanListItem;
  onChanged: (status: PlanStatus) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PlanStatus | null>(null); // awaiting confirm
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const apply = async (next: PlanStatus): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await updatePlan(plan.plan_id, { status: next });
      onChanged(next);
      setPending(null);
      setOpen(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const pick = (next: PlanStatus): void => {
    if (next === plan.status) {
      setOpen(false);
      return;
    }
    setOpen(false);
    if (CONFIRM[next]) setPending(next); // confirm final states first
    else void apply(next);
  };

  return (
    <div className="pl-statusctl" ref={ref}>
      <button
        type="button"
        className={`pl-status pl-status--${plan.status.toLowerCase()} pl-status--btn`}
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {busy && !pending ? 'Saving…' : titleCase(plan.status)}
        <ChevronDown size={13} aria-hidden="true" />
      </button>

      {open && (
        <ul className="pl-menu" role="listbox">
          {ALL_STATUSES.map((s) => (
            <li key={s}>
              <button
                type="button"
                role="option"
                aria-selected={s === plan.status}
                className={`pl-menu__item${s === plan.status ? ' is-current' : ''}`}
                onClick={() => pick(s)}
              >
                <span className={`pl-dot pl-dot--${s.toLowerCase()}`} aria-hidden="true" />
                {titleCase(s)}
                {s === plan.status && <Check size={14} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && !pending && <span className="pl-statusctl__err">{error}</span>}

      {pending && CONFIRM[pending] && (
        <div className="pl-confirm" role="dialog" aria-modal="true">
          <div className="pl-confirm__card">
            <h3 className="pl-confirm__title">{CONFIRM[pending]!.title}</h3>
            <p className="pl-confirm__body">{CONFIRM[pending]!.body}</p>
            {error && <p className="pl-confirm__err">{error}</p>}
            <div className="pl-confirm__actions">
              <button
                type="button"
                className="pl-confirm__cancel"
                disabled={busy}
                onClick={() => {
                  setPending(null);
                  setError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pl-confirm__go"
                disabled={busy}
                onClick={() => void apply(pending)}
              >
                {busy ? 'Saving…' : CONFIRM[pending]!.cta}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  onStatusChange,
}: {
  plan: PlanListItem;
  onStatusChange: (planId: string, status: PlanStatus) => void;
}): JSX.Element {
  const { navigate, setDocPlanId } = useApp();
  const items = [...plan.items].sort((a, b) => a.sequence - b.sequence);
  const openPlan = (): void => {
    setDocPlanId(plan.plan_id);
    navigate('docTherapyPlan');
  };
  return (
    <article className="pl-card">
      <header className="pl-card__head">
        <div>
          <h3 className="pl-card__title">{plan.title}</h3>
          <p className="pl-card__meta">
            <CalendarRange size={14} aria-hidden="true" />
            {fmtDate(plan.start_date)} – {fmtDate(plan.end_date)}
            <span className="pl-card__dot">•</span>
            <ListChecks size={14} aria-hidden="true" />
            {plan.item_count} exercise{plan.item_count === 1 ? '' : 's'}
          </p>
        </div>
        <div className="pl-card__actions">
          <PlanStatusControl plan={plan} onChanged={(s) => onStatusChange(plan.plan_id, s)} />
          <button type="button" className="pl-open" onClick={openPlan}>
            <Eye size={15} aria-hidden="true" /> View plan
          </button>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="pl-empty-items">No exercises in this plan yet.</p>
      ) : (
        <ol className="pl-items">
          {items.map((it) => (
            <ItemRow key={it.item_id} item={it} />
          ))}
        </ol>
      )}
    </article>
  );
}

export function PlansScreen(): JSX.Element {
  const { navigate } = useApp();
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [status, setStatus] = useState<PlanStatus | 'ALL'>('ALL');

  const load = useCallback(async (s: PlanStatus | 'ALL'): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setPlans(await listPlans(undefined, s === 'ALL' ? undefined : s));
    } catch (e) {
      setError(e);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(status);
  }, [status, load]);

  // Reflect a status change locally: update the card, and drop it from the list
  // if a specific status filter is active and it no longer matches.
  const onStatusChange = useCallback(
    (planId: string, newStatus: PlanStatus): void => {
      setPlans((prev) => {
        const next = prev.map((p) => (p.plan_id === planId ? { ...p, status: newStatus } : p));
        return status === 'ALL' ? next : next.filter((p) => p.status === status);
      });
    },
    [status],
  );

  return (
    <DoctorShell active="plans">
      <div className="doc-page">
        <div className="doc-page__head">
          <div>
            <h1 className="doc-page__title">Treatment Plans</h1>
            <p className="doc-page__sub">
              Every therapy plan and its scheduled exercises, in one clinical view.
            </p>
          </div>
          <button
            type="button"
            className="doc-btn doc-btn--primary"
            onClick={() => navigate('docPlanTemplates')}
          >
            <Plus size={18} aria-hidden="true" /> New Plan
          </button>
        </div>

        <div className="doc-toolbar">
          <label className="doc-sort">
            <span className="doc-sort__label">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as PlanStatus | 'ALL')}>
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          {!loading && !error && (
            <span className="pl-count">
              {plans.length} plan{plans.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {loading ? (
          <p className="doc-empty">Loading plans…</p>
        ) : error ? (
          <DocError error={error} onRetry={() => void load(status)} />
        ) : plans.length === 0 ? (
          <p className="doc-empty">
            {status === 'ALL' ? 'No plans yet.' : `No ${status.toLowerCase()} plans.`}
          </p>
        ) : (
          <div className="pl-list">
            {plans.map((p) => (
              <PlanCard key={p.plan_id} plan={p} onStatusChange={onStatusChange} />
            ))}
          </div>
        )}
      </div>
    </DoctorShell>
  );
}
