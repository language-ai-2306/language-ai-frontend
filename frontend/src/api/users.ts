/** User account endpoints (/users). */
import { request } from './client';
import type { UserRead, UserUpdate } from '../types/api';

/** PATCH /users/{id} — update the signed-in user's own account. */
export function updateUser(userId: string, patch: UserUpdate): Promise<UserRead> {
  return request<UserRead>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}
