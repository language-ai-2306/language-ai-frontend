/** Therapist (doctor) discovery + care-team request endpoints (/doctors). */
import { request } from './client';

export interface DoctorListItem {
  doctor_id: string; // doctor's user GUID
  first_name: string;
  last_name: string;
  qualification: string;
  bio: string;
  photo_url?: string | null;
}

export interface DoctorPage {
  items: DoctorListItem[];
  page: number;
  size: number;
  total: number;
  total_pages: number;
}

export interface RequestCreateResponse {
  request_id: string;
  doctor_id: string;
  status: string; // "PENDING"
}

/** GET /doctors — browsable list of therapists. */
export function listDoctors(page = 1, size = 20): Promise<DoctorPage> {
  return request<DoctorPage>(`/doctors?page=${page}&size=${size}`);
}

/** GET /doctors/my — the patient's assigned therapist, or null if none. */
export function getMyDoctor(): Promise<DoctorListItem | null> {
  return request<DoctorListItem | null>('/doctors/my');
}

/** DELETE /doctors/my — unlink the patient from their therapist. */
export function removeMyDoctor(): Promise<unknown> {
  return request<unknown>('/doctors/my', { method: 'DELETE' });
}

/** POST /doctors/{id}/request — ask a therapist to take on this patient. */
export function requestDoctor(doctorId: string): Promise<RequestCreateResponse> {
  return request<RequestCreateResponse>(`/doctors/${doctorId}/request`, { method: 'POST' });
}
