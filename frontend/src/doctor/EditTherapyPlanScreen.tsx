/**
 * EditTherapyPlanScreen — the editable Therapy Plan (tab-less focused page),
 * wired to the plans API.
 *
 *   • 'create' mode → blank, editable plan name; Save POSTs a new plan for the
 *     selected patient and activates it.
 *   • 'edit' mode → loads the plan named by docPlanId; Save diffs the rows against
 *     the loaded items and issues add / update / delete item calls.
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, FileDown, Pencil, Plus, PlusCircle, Trash2, X } from 'lucide-react';

import { ApiError } from '../api/client';
import {
  addPlanItem,
  createPlan,
  deletePlanItem,
  getPlan,
  updatePlan,
  updatePlanItem,
} from '../api/plans';
import { useApp } from '../store/AppStore';
import { DoctorShell } from './DoctorShell';
import {
  GAMES,
  TECHNIQUE_OPTIONS,
  WEEKDAYS,
  isNewRow,
  itemToRow,
  makeRow,
  rowToItemInput,
  type EditRow,
} from './planMapping';
import './edit-therapy-plan.css';

const byWeekday = (a: string, b: string): number => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b);

export function EditTherapyPlanScreen(): JSX.Element {
  const { state, navigate, setDocPlanId } = useApp();
  const create = state.planEditorMode === 'create';
  const planId = state.docPlanId;

  const [rows, setRows] = useState<EditRow[]>([]);
  const [planName, setPlanName] = useState(create ? 'New Therapy Plan' : 'Therapy Plan');
  const [editingName, setEditingName] = useState(false);
  const [dayPickerFor, setDayPickerFor] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(!create && !!planId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalIds, setOriginalIds] = useState<string[]>([]);

  // Edit mode: load the plan's items to pre-fill the editor.
  useEffect(() => {
    if (create || !planId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async (): Promise<void> => {
      try {
        const p = await getPlan(planId);
        if (cancelled) return;
        const loaded = [...p.items].sort((a, b) => a.sequence - b.sequence).map(itemToRow);
        setRows(loaded);
        setPlanName(p.title);
        setOriginalIds(loaded.map((r) => r.id));
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Could not load the plan.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [create, planId]);

  const closeMenus = (): void => {
    setDayPickerFor(null);
    setAddOpen(false);
  };

  const removeRow = (id: string): void => setRows((rs) => rs.filter((r) => r.id !== id));
  const removeDay = (id: string, day: string): void =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, days: r.days.filter((d) => d !== day) } : r)));
  const addDay = (id: string, day: string): void => {
    setRows((rs) =>
      rs.map((r) =>
        r.id === id && !r.days.includes(day) ? { ...r, days: [...r.days, day].sort(byWeekday) } : r,
      ),
    );
    setDayPickerFor(null);
  };
  const setDuration = (id: string, val: string): void =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, duration: Math.max(0, Math.min(120, Number(val) || 0)) } : r)),
    );
  const setDifficulty = (id: string, level: string): void =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, difficulty: level } : r)));
  const setTechnique = (id: string, technique: string): void =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, technique: technique || null } : r)));
  const addExercise = (name: string): void => {
    setRows((rs) => [...rs, makeRow(name, ['Mon'], 15, null)]);
    setAddOpen(false);
  };

  // ---- Save ---------------------------------------------------------------
  const save = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      if (create) {
        if (!state.docPatient?.id) {
          setError('Open a patient from All Patients first, then create a plan.');
          setSaving(false);
          return;
        }
        const created = await createPlan({
          patient_id: state.docPatient.id,
          title: planName.trim() || 'Therapy Plan',
          items: rows.map((r, i) => rowToItemInput(r, i + 1)),
        });
        // New plans start as DRAFT — activate so they surface as the patient's
        // active plan. Best-effort: a failed activation shouldn't lose the plan.
        try {
          await updatePlan(created.plan_id, { status: 'ACTIVE' });
        } catch {
          /* non-fatal */
        }
        setDocPlanId(created.plan_id);
        navigate('docTherapyPlan');
        return;
      }

      // Edit: diff rows against the originally-loaded items.
      if (!planId) {
        setError('No plan selected to save.');
        setSaving(false);
        return;
      }
      const currentIds = new Set(rows.map((r) => r.id));
      for (const id of originalIds) {
        if (!currentIds.has(id)) await deletePlanItem(planId, id);
      }
      for (let i = 0; i < rows.length; i++) {
        const input = rowToItemInput(rows[i], i + 1);
        if (isNewRow(rows[i].id)) {
          await addPlanItem(planId, input);
        } else {
          await updatePlanItem(planId, rows[i].id, {
            difficulty: input.difficulty,
            technique: input.technique,
            sequence: input.sequence,
            frequency: input.frequency,
            duration_minutes: input.duration_minutes,
            schedule: input.schedule,
          });
        }
      }
      navigate('docTherapyPlan');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the plan. Please try again.');
      setSaving(false);
    }
  };

  return (
    <DoctorShell showTabs={false}>
      <div className="doc-page etp-page">
        <button type="button" className="etp-back" onClick={() => navigate('docPatientDetail')}>
          <ArrowLeft size={18} aria-hidden="true" /> Back to Patient Profile
        </button>

        <div className="etp-head">
          <div className="etp-head__title">
            {create ? (
              editingName ? (
                <input
                  className="etp-nameinput"
                  value={planName}
                  autoFocus
                  onChange={(e) => setPlanName(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                  aria-label="Plan name"
                />
              ) : (
                <h1 className="etp-title">
                  {planName}
                  <button
                    type="button"
                    className="etp-nameedit"
                    onClick={() => setEditingName(true)}
                    aria-label="Edit plan name"
                  >
                    <Pencil size={18} aria-hidden="true" />
                  </button>
                </h1>
              )
            ) : (
              <h1 className="etp-title">Edit Therapy Plan</h1>
            )}
            <p className="etp-sub">
              {create ? 'Create a plan' : 'Modify the personalized therapy plan for this patient.'}
            </p>
          </div>
          <div className="etp-head__actions">
            <button type="button" className="doc-btn doc-btn--ghost" onClick={() => undefined}>
              <FileDown size={17} aria-hidden="true" /> Download PDF
            </button>
            <button
              type="button"
              className="doc-btn doc-btn--primary"
              onClick={() => void save()}
              disabled={saving || loading}
            >
              <Check size={17} aria-hidden="true" /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {error && (
          <p className="etp-error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="doc-empty">Loading plan…</p>
        ) : (
          <div className="etp-card">
            <div className="etp-table-wrap">
              <table className="etp-table">
                <thead>
                  <tr>
                    <th>Exercise Name</th>
                    <th>Recommended Days</th>
                    <th>Daily Duration</th>
                    <th>Difficulty Level</th>
                    <th>Technique</th>
                    <th className="etp-th-remove">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="etp-empty">
                        No exercises yet — add one to build this plan.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const remaining = WEEKDAYS.filter((d) => !r.days.includes(d));
                      return (
                        <tr key={r.id}>
                          <td className="etp-exname">{r.name}</td>
                          <td>
                            <div className="etp-days">
                              {r.days.map((d) => (
                                <span key={d} className="etp-daychip">
                                  {d}
                                  <button
                                    type="button"
                                    className="etp-daychip__x"
                                    onClick={() => removeDay(r.id, d)}
                                    aria-label={`Remove ${d}`}
                                  >
                                    <X size={12} aria-hidden="true" />
                                  </button>
                                </span>
                              ))}
                              <div className="etp-daypick">
                                <button
                                  type="button"
                                  className="etp-addday"
                                  onClick={() => setDayPickerFor((cur) => (cur === r.id ? null : r.id))}
                                  disabled={remaining.length === 0}
                                >
                                  <Plus size={13} aria-hidden="true" /> Add Day
                                </button>
                                {dayPickerFor === r.id && remaining.length > 0 && (
                                  <div className="etp-daymenu">
                                    {remaining.map((d) => (
                                      <button
                                        key={d}
                                        type="button"
                                        className="etp-daymenu__item"
                                        onClick={() => addDay(r.id, d)}
                                      >
                                        {d}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="etp-dur">
                              <input
                                type="number"
                                min={1}
                                max={120}
                                className="etp-durinput"
                                value={r.duration}
                                onChange={(e) => setDuration(r.id, e.target.value)}
                                aria-label={`${r.name} daily minutes`}
                              />
                              <span className="etp-dur__unit">mins</span>
                            </div>
                          </td>
                          <td>
                            {r.adaptive ? (
                              <span className="etp-adaptive">Adaptive AI</span>
                            ) : (
                              <div className="etp-levels">
                                {r.levels.map((lvl) => (
                                  <button
                                    key={lvl}
                                    type="button"
                                    className={`etp-pill${lvl === r.difficulty ? ' etp-pill--on' : ''}`}
                                    onClick={() => setDifficulty(r.id, lvl)}
                                  >
                                    {lvl}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                          <td>
                            <select
                              className="etp-durinput"
                              value={r.technique ?? ''}
                              onChange={(e) => setTechnique(r.id, e.target.value)}
                              aria-label={`${r.name} fluency technique`}
                            >
                              {TECHNIQUE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="etp-td-remove">
                            <button
                              type="button"
                              className="etp-remove"
                              onClick={() => removeRow(r.id)}
                              aria-label={`Remove ${r.name}`}
                            >
                              <Trash2 size={17} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="etp-cardfoot">
              <p className="etp-note">
                Changes made here will immediately update the child&apos;s personalized therapy plan.
              </p>
              <div className="etp-addwrap">
                <button type="button" className="etp-add" onClick={() => setAddOpen((o) => !o)}>
                  <PlusCircle size={17} aria-hidden="true" /> Add Exercise
                </button>
                {addOpen && (
                  <div className="etp-addmenu">
                    {GAMES.map((g) => (
                      <button
                        key={g}
                        type="button"
                        className="etp-addmenu__item"
                        onClick={() => addExercise(g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {(dayPickerFor !== null || addOpen) && (
        <div className="etp-backdrop" onClick={closeMenus} aria-hidden="true" />
      )}
    </DoctorShell>
  );
}
