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

/** A title already sitting in the name, e.g. first_name = "Dr" / "Dr." / "Prof". */
const TITLE_RE = /^(dr|doctor|prof|mr|mrs|ms|mx)\b\.?\s*/i;

/**
 * "Dr."-prefixed display name that doesn't double a title the record already
 * carries — first_name = "Dr", last_name = "Smith" used to render "Dr. Dr Smith".
 */
export function doctorDisplayName(first?: string | null, last?: string | null): string {
  const raw = `${first ?? ''} ${last ?? ''}`.replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  const bare = raw.replace(TITLE_RE, '').trim();
  return bare ? `Dr. ${bare}` : raw; // name is only a title → leave it as-is
}

/** Avatar initials from the name minus any title: "Dr Smith" → "S", not "DD". */
export function doctorInitials(first?: string | null, last?: string | null): string {
  const raw = `${first ?? ''} ${last ?? ''}`.replace(/\s+/g, ' ').trim();
  const parts = (raw.replace(TITLE_RE, '').trim() || raw).split(' ').filter(Boolean);
  const ini = (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '');
  return ini.toUpperCase();
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

export interface TherapistStatus {
  state: 'assigned' | 'pending' | 'none';
  doctor: DoctorListItem | null;
}

/** GET /doctors/my-status — assigned / pending / none, with the doctor's details. */
export function getTherapistStatus(): Promise<TherapistStatus> {
  return request<TherapistStatus>('/doctors/my-status');
}

/** DELETE /doctors/my — unlink the patient from their therapist. */
export function removeMyDoctor(): Promise<unknown> {
  return request<unknown>('/doctors/my', { method: 'DELETE' });
}

/** POST /doctors/{id}/request — ask a therapist to take on this patient. */
export function requestDoctor(doctorId: string): Promise<RequestCreateResponse> {
  return request<RequestCreateResponse>(`/doctors/${doctorId}/request`, { method: 'POST' });
}
