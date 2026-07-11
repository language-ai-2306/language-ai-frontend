/**
 * planMapping — the single place that translates between the plan UI's friendly
 * labels (exercise names, "Mon", "Medium") and the backend's enums
 * (REPEAT_AFTER_ME, "MON", MEDIUM). Shared by the Therapy Plan view and editor.
 */
import type { Difficulty, PlanItem, PlanItemInput } from '../api/plans';

export const GAMES = [
  'Read It Loud',
  'Picture Talk',
  'Story Teller',
  'Repeat After Me',
  'Talk with Ollie',
] as const;

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_CODES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const TYPE_BY_NAME: Record<string, string> = {
  'Read It Loud': 'READ_IT_LOUD',
  'Picture Talk': 'PICTURE_TALK',
  'Story Teller': 'STORY_TELLER',
  'Repeat After Me': 'REPEAT_AFTER_ME',
  'Talk with Ollie': 'TALK_WITH_OLLIE',
};
const NAME_BY_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_BY_NAME).map(([name, type]) => [type, name]),
);

const DIFF_ENUM: Record<string, Difficulty> = {
  Easy: 'EASY',
  Medium: 'MEDIUM',
  Hard: 'HARD',
  'Tongue Twister': 'TONGUE_TWISTER',
};
const DIFF_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(DIFF_ENUM).map(([label, enumv]) => [enumv, label]),
);

const titleCase = (s: string): string =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const dayLabel = (code: string): string => WEEKDAYS[DAY_CODES.indexOf(code)] ?? code;
const dayCode = (label: string): string => DAY_CODES[WEEKDAYS.indexOf(label)] ?? label.toUpperCase();

/** Difficulty options offered for an exercise ([] = adaptive, no levels). */
export function levelsFor(name: string): string[] {
  if (name === 'Talk with Ollie') return [];
  if (name === 'Repeat After Me') return ['Easy', 'Medium', 'Hard', 'Tongue Twister'];
  return ['Easy', 'Medium', 'Hard'];
}

export const exerciseLabel = (type: string): string => NAME_BY_TYPE[type] ?? titleCase(type);
export const difficultyLabel = (d?: string | null): string | null =>
  d ? (DIFF_LABEL[d] ?? titleCase(d)) : null;

/** Human "recommended days" string for a plan item (view). */
export function daysLabel(item: PlanItem): string {
  if (item.frequency === 'DAILY') return 'Daily';
  const dow = (item.schedule?.days_of_week as string[] | undefined) ?? [];
  return dow.length ? dow.map(dayLabel).join(', ') : '—';
}

/** An editable row in the plan editor. `id` is the backend item GUID for loaded
 *  rows, or a local `ex-N` id for freshly-added ones (used to diff on save). */
export interface EditRow {
  id: string;
  name: string;
  days: string[];
  duration: number;
  difficulty: string | null;
  technique: string | null;
  levels: string[];
  adaptive: boolean;
}

let _nextId = 1;
export const localRowId = (): string => `ex-${_nextId++}`;
/** True for a row that isn't backed by a saved item yet (needs POST on save). */
export const isNewRow = (id: string): boolean => id.startsWith('ex-');

export function makeRow(
  name: string,
  days: string[],
  duration: number,
  difficulty: string | null,
  technique: string | null = null,
  id: string = localRowId(),
): EditRow {
  const levels = levelsFor(name);
  return {
    id,
    name,
    days,
    duration,
    difficulty: levels.length ? (difficulty ?? levels[0]) : null,
    technique,
    levels,
    adaptive: levels.length === 0,
  };
}

/** Backend plan item → editable row (keeps the item GUID as the row id). */
export function itemToRow(item: PlanItem): EditRow {
  const name = exerciseLabel(item.exercise_type);
  const dow = (item.schedule?.days_of_week as string[] | undefined) ?? [];
  const days = item.frequency === 'DAILY' ? [...WEEKDAYS] : dow.map(dayLabel);
  return makeRow(name, days, item.duration_minutes ?? 15, difficultyLabel(item.difficulty),
    item.technique ?? null, item.item_id);
}

/** Editable row → backend item input (POST/PATCH). All 7 days or none → DAILY;
 *  1–6 days → WEEKLY with days_of_week (which the backend requires). */
export function rowToItemInput(row: EditRow, sequence: number): PlanItemInput {
  const weekly = row.days.length > 0 && row.days.length < 7;
  return {
    exercise_type: TYPE_BY_NAME[row.name] ?? 'REPEAT_AFTER_ME',
    difficulty: row.adaptive ? null : (DIFF_ENUM[row.difficulty ?? ''] ?? null),
    technique: row.technique || null,
    sequence,
    frequency: weekly ? 'WEEKLY' : 'DAILY',
    duration_minutes: row.duration || null,
    schedule: weekly ? { days_of_week: row.days.map(dayCode) } : {},
  };
}

/** Technique options for the plan editor dropdown (value → kid-facing label). */
export const TECHNIQUE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'SYLLABLE_TIMED', label: 'Steady Beats' },
];
