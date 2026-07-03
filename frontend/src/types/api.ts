/**
 * TypeScript mirrors of the real backend's API schemas (FastAPI / Pydantic).
 * Add to this file as endpoints are integrated. GUIDs are strings.
 */

export type Role = 'PATIENT' | 'DOCTOR';

/** Identity fields shared by both signup variants (UserBase). */
interface SignupBase {
  email: string;
  first_name: string;
  last_name: string;
  dob: string; // YYYY-MM-DD
  gender: string; // 'M' | 'F' | 'O'
  password: string; // min 8
  phone_number?: string | null;
}

export interface PatientSignup extends SignupBase {
  role: 'PATIENT';
  nickname: string; // required
  avatar_id?: number | null;
  ailment_ids?: number[];
  doctor_id?: string | null; // doctor user GUID (creates a pending link request)
  // Guardian details — for minors.
  guardian_name?: string | null;
  guardian_relationship?: string | null;
  guardian_email?: string | null;
}

export interface DoctorSignup extends SignupBase {
  role: 'DOCTOR';
  qualification: string; // required
  bio: string; // required
  address?: string | null;
  photo_url?: string | null;
}

/** POST /auth/signup body — discriminated on `role`. */
export type SignupPayload = PatientSignup | DoctorSignup;

/** POST /auth/login response (OAuth2 password flow). */
export interface Token {
  access_token: string;
  token_type: string;
}

/** UserRead — what /auth/signup, /auth/me, etc. return. `id` is a GUID. */
export interface UserRead {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  dob?: string;
  gender?: string;
  phone_number?: string | null;
}
