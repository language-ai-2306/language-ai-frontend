/** Treatment plans (/v1/plans) — a patient's plans and their exercise items. */
import { request } from './client';

export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'TONGUE_TWISTER';
export type PlanItemStatus = 'LOCKED' | 'ACTIVE' | 'COMPLETED';

/** One exercise within a plan (PlanItemRead). */
export interface PlanItem {
  item_id: string;
  sequence: number;
  exercise_type: string; // REPEAT_AFTER_ME | READ_IT_LOUD | …
  target_phoneme?: string | null;
  difficulty?: Difficulty | null;
  frequency: string;
  duration_minutes?: number | null;
  schedule: Record<string, unknown>;
  dosage: Record<string, unknown>;
  advancement: Record<string, unknown>;
  status: PlanItemStatus;
}

/** A plan with its items embedded (PlanListItem). */
export interface PlanListItem {
  plan_id: string;
  title: string;
  status: PlanStatus;
  start_date?: string | null;
  end_date?: string | null;
  item_count: number;
  items: PlanItem[];
}

/**
 * GET /v1/plans — list plans. Optionally scope to one patient and/or a status.
 * Omitting patient_id lists the plans visible to the caller (the doctor's own).
 */
export function listPlans(patientId?: string, status?: PlanStatus): Promise<PlanListItem[]> {
  const q = new URLSearchParams();
  if (patientId) q.set('patient_id', patientId);
  if (status) q.set('status', status);
  const qs = q.toString();
  return request<PlanListItem[]>(`/v1/plans${qs ? `?${qs}` : ''}`);
}

/** A plan with full detail (PlanRead) — returned by GET/PATCH /v1/plans/{id}. */
export interface PlanRead {
  plan_id: string;
  patient_id: string;
  doctor_id?: string | null;
  title: string;
  description?: string | null;
  status: PlanStatus;
  start_date?: string | null;
  end_date?: string | null;
  items: PlanItem[];
}

/** Fields a plan update may change (PlanUpdate). */
export interface PlanUpdate {
  title?: string | null;
  description?: string | null;
  status?: PlanStatus | null;
  start_date?: string | null;
  end_date?: string | null;
}

/** PATCH /v1/plans/{id} — update a plan (status, dates, title). */
export function updatePlan(planId: string, patch: PlanUpdate): Promise<PlanRead> {
  return request<PlanRead>(`/v1/plans/${planId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/** GET /v1/plans/{id} — one plan with its items. */
export function getPlan(planId: string): Promise<PlanRead> {
  return request<PlanRead>(`/v1/plans/${planId}`);
}

/** One exercise to add to a plan (PlanItemCreate). Schedule is required for
 *  WEEKLY frequency: `{ days_of_week: ["MON","WED"] }`. */
export interface PlanItemInput {
  exercise_type: string;
  target_phoneme?: string | null;
  difficulty?: Difficulty | null; // omit for TALK_WITH_OLLIE
  sequence?: number;
  frequency?: string; // DAILY | WEEKLY | MONTHLY | CUSTOM
  duration_minutes?: number | null;
  schedule?: Record<string, unknown>;
  dosage?: Record<string, unknown>;
  advancement?: Record<string, unknown>;
}

/** Body for POST /v1/plans (PlanCreate). `patient_id` is the patient user GUID. */
export interface PlanCreateInput {
  patient_id: string;
  title: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  items?: PlanItemInput[];
}

/** POST /v1/plans — create a tailored plan for a patient. Returns it with items. */
export function createPlan(input: PlanCreateInput): Promise<PlanRead> {
  return request<PlanRead>('/v1/plans', { method: 'POST', body: JSON.stringify(input) });
}

/** POST /v1/plans/{id}/items — append one exercise. */
export function addPlanItem(planId: string, item: PlanItemInput): Promise<PlanItem> {
  return request<PlanItem>(`/v1/plans/${planId}/items`, {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

/** Fields a plan item update may change (PlanItemUpdate). */
export interface PlanItemPatch {
  target_phoneme?: string | null;
  difficulty?: Difficulty | null;
  sequence?: number;
  frequency?: string;
  duration_minutes?: number | null;
  schedule?: Record<string, unknown>;
  dosage?: Record<string, unknown>;
  advancement?: Record<string, unknown>;
  status?: PlanItemStatus;
}

/** PATCH /v1/plans/{id}/items/{itemId} — update one exercise. */
export function updatePlanItem(
  planId: string,
  itemId: string,
  patch: PlanItemPatch,
): Promise<PlanItem> {
  return request<PlanItem>(`/v1/plans/${planId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/** DELETE /v1/plans/{id}/items/{itemId} — remove one exercise. */
export function deletePlanItem(planId: string, itemId: string): Promise<unknown> {
  return request<unknown>(`/v1/plans/${planId}/items/${itemId}`, { method: 'DELETE' });
}
