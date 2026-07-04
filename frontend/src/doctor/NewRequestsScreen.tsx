/**
 * NewRequestsScreen — pending patient link-requests for this doctor (desktop-only).
 *
 * Wired to GET /patient/request (list) and POST /patient/request (approve/reject).
 * The endpoint returns name + nickname + requested date; the mockup's age / parent
 * / contact / "speech concern" fields aren't provided by the API, so they show as
 * "Not provided" placeholders until a richer request payload exists.
 */
import { useCallback, useEffect, useState } from 'react';
import { Calendar, Check, User, X } from 'lucide-react';

import { ApiError } from '../api/client';
import { actOnRequest, listPatientRequests, type PatientRequest } from '../api/doctorDashboard';
import { DoctorShell } from './DoctorShell';
import { DocError } from './DocError';
import './requests.css';

function initials(first: string, last: string): string {
  return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?';
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function RequestCard({
  req,
  onResolved,
}: {
  req: PatientRequest;
  onResolved: (id: string, status: string) => void;
}): JSX.Element {
  const [busy, setBusy] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fullName = `${req.first_name} ${req.last_name}`.trim();

  const act = async (action: 'APPROVE' | 'REJECT'): Promise<void> => {
    setBusy(action);
    setError(null);
    try {
      const res = await actOnRequest(req.request_id, action);
      onResolved(req.request_id, res.status);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action failed. Please try again.');
      setBusy(null);
    }
  };

  return (
    <article className="rq-card">
      <span className="rq-card__accent" aria-hidden="true" />

      <header className="rq-card__head">
        <span className="rq-card__avatar" aria-hidden="true">
          {initials(req.first_name, req.last_name)}
        </span>
        <div>
          <h3 className="rq-card__name">
            {fullName || req.nickname}
            {req.nickname && <span className="rq-card__nick"> @{req.nickname}</span>}
          </h3>
          <p className="rq-card__parent">
            <User size={14} aria-hidden="true" /> Parent: Not provided
          </p>
        </div>
        <span className="rq-card__badge">Pending Review</span>
      </header>

      <div className="rq-card__grid">
        <div className="rq-field">
          <span className="rq-field__label">
            <Calendar size={13} aria-hidden="true" /> Requested Date
          </span>
          <span className="rq-field__val">{fmtDate(req.requested_at)}</span>
        </div>
        <div className="rq-field">
          <span className="rq-field__label">Contact</span>
          <span className="rq-field__val rq-field__val--muted">Not provided</span>
        </div>
      </div>

      <div className="rq-note">
        <span className="rq-field__label">Speech Concern (Parent Note)</span>
        <p className="rq-note__text">No note provided with this request.</p>
      </div>

      {error && <p className="rq-error">{error}</p>}

      <div className="rq-actions">
        <button
          type="button"
          className="rq-btn rq-btn--accept"
          disabled={busy !== null}
          onClick={() => void act('APPROVE')}
        >
          <Check size={16} aria-hidden="true" /> {busy === 'APPROVE' ? 'Accepting…' : 'Accept'}
        </button>
        <button type="button" className="rq-btn rq-btn--schedule" disabled={busy !== null} onClick={() => undefined}>
          Schedule Consultation
        </button>
        <button
          type="button"
          className="rq-btn rq-btn--reject"
          disabled={busy !== null}
          aria-label="Reject request"
          onClick={() => void act('REJECT')}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export function NewRequestsScreen(): JSX.Element {
  const [requests, setRequests] = useState<PatientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await listPatientRequests());
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onResolved = (id: string, status: string): void => {
    setRequests((rs) => rs.filter((r) => r.request_id !== id));
    setToast(`Request ${status.toLowerCase()}.`);
    window.setTimeout(() => setToast(null), 2500);
  };

  return (
    <DoctorShell active="requests">
      <div className="doc-page">
        <div className="doc-page__head">
          <div>
            <h1 className="doc-page__title">New Patient Requests</h1>
            <p className="doc-page__sub">Review and manage pending evaluation requests from families.</p>
          </div>
        </div>

        {toast && <div className="rq-toast" role="status">{toast}</div>}

        {loading ? (
          <p className="doc-empty">Loading requests…</p>
        ) : error ? (
          <DocError error={error} onRetry={() => void load()} />
        ) : requests.length === 0 ? (
          <p className="doc-empty">No pending requests right now. 🎉</p>
        ) : (
          <div className="rq-grid">
            {requests.map((r) => (
              <RequestCard key={r.request_id} req={r} onResolved={onResolved} />
            ))}
          </div>
        )}
      </div>
    </DoctorShell>
  );
}
