/**
 * PatientDashboardScreen — the doctor's "All Patients" caseload (desktop-only).
 *
 * Wired to GET /v1/patient (listApprovedPatients) — this doctor's approved
 * patients, paginated. Surfaces every field the endpoint returns: first_name,
 * last_name, nickname, patient_id, and the pagination envelope (page / size /
 * total / total_pages). Search + sort run client-side over the loaded page.
 *
 * Requires a doctor bearer token; previewing without login shows an auth notice.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';

import { listApprovedPatients, type PatientListItem, type PatientPage } from '../api/doctorDashboard';
import { useApp } from '../store/AppStore';
import { DoctorShell } from './DoctorShell';
import { DocError } from './DocError';

const PAGE_SIZE = 12;
type SortKey = 'name' | 'nickname';

function initials(first: string, last: string): string {
  return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?';
}

function PatientCard({ p }: { p: PatientListItem }): JSX.Element {
  const { setDocPatient, navigate } = useApp();
  const fullName = `${p.first_name} ${p.last_name}`.trim();

  const openReport = (): void => {
    setDocPatient({ id: p.patient_id, name: fullName });
    navigate('docPatientDetail');
  };

  return (
    <article className="pt-card">
      <header className="pt-card__head">
        <span className="pt-card__avatar" aria-hidden="true">
          {initials(p.first_name, p.last_name)}
        </span>
        <div className="pt-card__id">
          <h3 className="pt-card__name">{fullName || p.nickname}</h3>
          <p className="pt-card__meta">@{p.nickname}</p>
        </div>
      </header>

      <hr className="pt-card__rule" />

      <p className="pt-card__pid">
        <span className="pt-card__pid-label">Patient ID</span>
        <code className="pt-card__pid-val" title={p.patient_id}>
          {p.patient_id}
        </code>
      </p>

      <button type="button" className="pt-card__report" onClick={openReport}>
        View Report <ArrowRight size={16} aria-hidden="true" />
      </button>
    </article>
  );
}

export function PatientDashboardScreen(): JSX.Element {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PatientPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('name');

  const load = useCallback(async (p: number): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setData(await listApprovedPatients(p, PAGE_SIZE));
    } catch (e) {
      setError(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [page, load]);

  // Client-side search + sort over the currently-loaded page.
  const items = useMemo(() => {
    const all = data?.items ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? all.filter((p) =>
          `${p.first_name} ${p.last_name} ${p.nickname} ${p.patient_id}`.toLowerCase().includes(q),
        )
      : all.slice();
    filtered.sort((a, b) =>
      sort === 'nickname'
        ? a.nickname.localeCompare(b.nickname)
        : `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`),
    );
    return filtered;
  }, [data, query, sort]);

  const totalPages = data?.total_pages ?? 1;

  return (
    <DoctorShell active="patients">
      <div className="doc-page">
        <div className="doc-page__head">
          <div>
            <h1 className="doc-page__title">Patient Dashboard</h1>
            <p className="doc-page__sub">
              Monitor therapy progress and upcoming sessions in a unified, clinically-focused view.
            </p>
          </div>
          <button type="button" className="doc-btn doc-btn--primary" onClick={() => undefined}>
            <Plus size={18} aria-hidden="true" /> New Patient
          </button>
        </div>

        <div className="doc-toolbar">
          <div className="doc-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patients by name, nickname or ID…"
              aria-label="Search patients"
            />
          </div>
          <label className="doc-sort">
            <span className="doc-sort__label">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="name">Name (A–Z)</option>
              <option value="nickname">Nickname (A–Z)</option>
            </select>
          </label>
        </div>

        {loading ? (
          <p className="doc-empty">Loading patients…</p>
        ) : error ? (
          <DocError error={error} onRetry={() => void load(page)} />
        ) : items.length === 0 ? (
          <p className="doc-empty">
            {query
              ? `No patients match “${query}”.`
              : 'No approved patients yet. Accept a request to add one.'}
          </p>
        ) : (
          <>
            <div className="pt-grid">
              {items.map((p) => (
                <PatientCard key={p.patient_id} p={p} />
              ))}
            </div>

            <div className="doc-pager">
              <span className="doc-pager__count">
                {data ? `${data.total} patient${data.total === 1 ? '' : 's'} • page ${data.page} of ${totalPages}` : ''}
              </span>
              <div className="doc-pager__controls">
                <button
                  type="button"
                  className="doc-pager__btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} aria-hidden="true" /> Prev
                </button>
                <button
                  type="button"
                  className="doc-pager__btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  Next <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </DoctorShell>
  );
}
