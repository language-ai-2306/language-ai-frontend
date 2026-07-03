/** Patient dashboard (/v1/patient/dashboard) — today's + this week's plan tasks. */
import { request } from './client';

export interface DashboardItem {
  item_id: string; // plan item GUID
  plan_id: string;
  plan_title: string;
  exercise_type: string; // REPEAT_AFTER_ME | READ_IT_LOUD | STORY_TELLER | PICTURE_TALK | TALK_WITH_OLLIE
  target_phoneme?: string | null;
  difficulty?: string | null;
  frequency: string;
  duration_minutes?: number | null;
  dosage: Record<string, unknown>;
  status: string;
  attempts_today: number;
  due: boolean;
}

export interface Dashboard {
  today: DashboardItem[];
  weekly: unknown[];
  totalTasksToday: number;
  completedTasksToday: number;
  totalTasksWeekly: number;
  completedTasksWeekly: number;
}

export function getDashboard(): Promise<Dashboard> {
  return request<Dashboard>('/v1/patient/dashboard');
}
