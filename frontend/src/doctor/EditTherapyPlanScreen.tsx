/**
 * EditTherapyPlanScreen — the editable Therapy Plan (tab-less focused page).
 * Reached from "Edit Plan" (pre-filled with the plan's exercises) or from
 * "Customize New Plan" (blank, with an editable plan name). Lets the clinician
 * tweak each exercise's schedule days, daily duration and difficulty, remove
 * exercises, and add new ones.
 *
 * Local, in-memory editing for now (demo); wire Save Changes to
 * PATCH /v1/plans/{id} (+ its items) to persist.
 */
import { useState } from 'react';
import { ArrowLeft, Check, FileDown, Pencil, Plus, PlusCircle, Trash2, X } from 'lucide-react';

import { useApp } from '../store/AppStore';
import { DoctorShell } from './DoctorShell';
import './edit-therapy-plan.css';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const GAMES = ['Read It Loud', 'Picture Talk', 'Story Teller', 'Repeat After Me', 'Talk with Ollie'];

interface EditRow {
  id: string;
  name: string;
  days: string[];
  duration: number;
  /** Selected difficulty; null for adaptive (Talk with Ollie). */
  difficulty: string | null;
  /** Available difficulty options ([] for adaptive). */
  levels: string[];
  adaptive: boolean;
}

let _nextId = 1;
const uid = (): string => `ex-${_nextId++}`;

function levelsFor(name: string): string[] {
  if (name === 'Talk with Ollie') return [];
  if (name === 'Repeat After Me') return ['Easy', 'Medium', 'Hard', 'Tongue Twister'];
  return ['Easy', 'Medium', 'Hard'];
}

function makeRow(name: string, days: string[], duration: number, difficulty: string | null): EditRow {
  const levels = levelsFor(name);
  return {
    id: uid(),
    name,
    days,
    duration,
    difficulty: levels.length ? (difficulty ?? levels[0]) : null,
    levels,
    adaptive: levels.length === 0,
  };
}

/** Pre-filled plan for "edit" mode (matches the Therapy Plan view). */
function initialRows(): EditRow[] {
  return [
    makeRow('Read It Loud', ['Mon', 'Wed', 'Fri'], 15, 'Medium'),
    makeRow('Picture Talk', ['Tue', 'Thu'], 15, 'Medium'),
    makeRow('Story Teller', ['Mon', 'Thu'], 15, 'Easy'),
    makeRow('Repeat After Me', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], 15, 'Medium'),
    makeRow('Talk with Ollie', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 10, null),
  ];
}

const byWeekday = (a: string, b: string): number => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b);

export function EditTherapyPlanScreen(): JSX.Element {
  const { state, navigate } = useApp();
  const create = state.planEditorMode === 'create';

  const [rows, setRows] = useState<EditRow[]>(() => (create ? [] : initialRows()));
  const [planName, setPlanName] = useState(create ? 'New Therapy Plan' : 'Therapy Plan');
  const [editingName, setEditingName] = useState(false);
  const [dayPickerFor, setDayPickerFor] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

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
        r.id === id && !r.days.includes(day)
          ? { ...r, days: [...r.days, day].sort(byWeekday) }
          : r,
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
  const addExercise = (name: string): void => {
    setRows((rs) => [...rs, makeRow(name, ['Mon'], 15, null)]);
    setAddOpen(false);
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
              onClick={() => navigate('docTherapyPlan')}
            >
              <Check size={17} aria-hidden="true" /> Save Changes
            </button>
          </div>
        </div>

        <div className="etp-card">
          <div className="etp-table-wrap">
            <table className="etp-table">
              <thead>
                <tr>
                  <th>Exercise Name</th>
                  <th>Recommended Days</th>
                  <th>Daily Duration</th>
                  <th>Difficulty Level</th>
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
      </div>

      {(dayPickerFor !== null || addOpen) && (
        <div className="etp-backdrop" onClick={closeMenus} aria-hidden="true" />
      )}
    </DoctorShell>
  );
}
