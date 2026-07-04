/**
 * Doctor-dashboard API — the clinician-facing caseload list, per-patient clinical
 * dashboards, and attempt recordings. Mirrors the real backend schemas exactly.
 *
 * Two patient lists exist and are NOT the same:
 *   • GET /v1/patient          → approved patients, paginated, thin (name/nickname).
 *                                 Drives the "All Patients" dashboard.
 *   • GET /v1/doctor/patients  → caseload triage with clinical metrics (richer).
 */
import { ApiError, request } from './client';
import { getToken } from './token';

/* ------------------------------------------------------------------ *
 *  GET /v1/patient — approved patients (paginated). Dashboard source.
 * ------------------------------------------------------------------ */
export interface PatientListItem {
  patient_id: string;
  first_name: string;
  last_name: string;
  nickname: string;
}

export interface PatientPage {
  items: PatientListItem[];
  page: number;
  size: number;
  total: number;
  total_pages: number;
}

/** GET /v1/patient — this doctor's approved patients, paginated. Requires a
 *  doctor bearer token (attached automatically by the client). */
export function listApprovedPatients(page = 1, size = 12): Promise<PatientPage> {
  return request<PatientPage>(`/v1/patient?page=${page}&size=${size}`);
}

/* ------------------------------------------------------------------ *
 *  GET /v1/doctor/patients — caseload triage (richer, not on the list view).
 * ------------------------------------------------------------------ */
export interface CaseloadPatient {
  patient_id: string;
  name: string;
  email?: string | null;
  age?: number | null;
  last_active_at?: string | null;
  adherence_pct?: number | null;
  current_ss?: number | null;
  ss_trend?: string | null;
  dominant_disfluency?: string | null;
  alerts?: string[];
}

export interface Caseload {
  patients: CaseloadPatient[];
}

/** GET /v1/doctor/patients — caseload overview (triage metrics per patient). */
export function listCaseload(): Promise<Caseload> {
  return request<Caseload>('/v1/doctor/patients');
}

/* ------------------------------------------------------------------ *
 *  GET /v1/doctor/patients/{id} — one patient's full clinical dashboard.
 * ------------------------------------------------------------------ */
/** A metric with its current value and change vs last week / baseline. */
export interface Metric {
  value?: number | null;
  vs_last_week?: number | null;
  vs_baseline?: number | null;
}

export interface FluencyTrendPoint {
  week_start: string;
  avg_fluency?: number | null;
  avg_ss?: number | null;
  attempts: number;
}

export interface ContextComparison {
  exercise_type: string;
  attempts: number;
  avg_fluency?: number | null;
  avg_ss?: number | null;
}

export interface PerSound {
  target_phoneme: string;
  current_difficulty?: string | null;
  mastery_level?: string | null;
  rolling_ss?: number | null;
  attempts: number;
}

export interface PracticeDay {
  date: string;
  completed: number;
}

export interface PatientDetail {
  patient_id: string;
  name: string;
  age?: number | null;
  dominant_disfluency?: string | null;
  active_plans?: string[];
  fluency: Metric;
  stutter_frequency: Metric;
  words_per_minute: Metric;
  fluency_trend?: FluencyTrendPoint[];
  disfluency_breakdown?: Record<string, number>;
  context_comparison?: ContextComparison[];
  per_sound?: PerSound[];
  adherence_this_week?: Record<string, unknown>;
  practice_calendar?: PracticeDay[];
}

/** GET /v1/doctor/patients/{id} — full clinical dashboard for one patient. */
export function getPatientDetail(patientId: string): Promise<PatientDetail> {
  return request<PatientDetail>(`/v1/doctor/patients/${patientId}`);
}

/**
 * GET /v1/doctor/patients/{id}/report.pdf — the patient progress report as a PDF.
 * Uses a direct fetch (not the JSON-only `request` helper) to receive the binary
 * blob, but mirrors its auth + ngrok headers.
 */
export async function getPatientReportPdf(patientId: string, windowDays?: number): Promise<Blob> {
  const token = getToken();
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
  const qs = windowDays ? `?window_days=${windowDays}` : '';
  const res = await fetch(`${base}/v1/doctor/patients/${patientId}/report.pdf${qs}`, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new ApiError(`Could not generate the report (${res.status}).`, res.status);
  }
  return res.blob();
}

/* ------------------------------------------------------------------ *
 *  GET /v1/doctor/patients/{id}/attempts — recorded practice attempts.
 * ------------------------------------------------------------------ */
export interface AttemptSummary {
  attempt_id: string;
  created_at: string;
  exercise_type?: string | null;
  fluency_score?: number | null;
  stutter_frequency_percent?: number | null;
  words_per_minute?: number | null;
  dominant_disfluency?: string | null;
}

export interface AttemptsPage {
  attempts: AttemptSummary[];
  total: number;
}

/** GET /v1/doctor/patients/{id}/attempts — newest first, paged. */
export function listPatientAttempts(
  patientId: string,
  limit = 10,
  offset = 0,
): Promise<AttemptsPage> {
  return request<AttemptsPage>(
    `/v1/doctor/patients/${patientId}/attempts?limit=${limit}&offset=${offset}`,
  );
}

/* ------------------------------------------------------------------ *
 *  /patient/request — pending patient link requests to this doctor.
 * ------------------------------------------------------------------ */
export interface PatientRequest {
  request_id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  requested_at: string; // ISO
}

/** GET /patient/request — this doctor's pending patient requests. */
export function listPatientRequests(): Promise<PatientRequest[]> {
  return request<PatientRequest[]>('/patient/request');
}

export interface RequestActionResponse {
  request_id: string;
  status: string;
  responded_at?: string | null;
}

/** POST /patient/request — approve or reject a pending request. */
export function actOnRequest(
  requestId: string,
  action: 'APPROVE' | 'REJECT',
): Promise<RequestActionResponse> {
  return request<RequestActionResponse>('/patient/request', {
    method: 'POST',
    body: JSON.stringify({ request_id: requestId, action }),
  });
}
