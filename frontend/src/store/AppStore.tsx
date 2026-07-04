/**
 * AppStore — global app state via Context + reducer.
 *
 * Holds navigation, the player profile, gamification (XP/level/stars/streak),
 * the current session's stats (for the summary), and a transient reward toast.
 * Progress, name, and settings persist to localStorage; the session is fresh
 * each app load and is rolled into a summary on demand.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import { UNAUTHORIZED_EVENT } from '../api/client';
import { clearToken, getToken } from '../api/token';
import type { Role } from '../types/api';

export type Screen =
  | 'login'
  | 'signup'
  | 'verifyEmail'
  | 'profileSetup'
  | 'therapistSetup'
  | 'onboardingComplete'
  | 'quickStart'
  | 'home'
  | 'repeatSelect'
  | 'read'
  | 'chat'
  | 'breathing'
  | 'summary'
  | 'companion'
  | 'assessment'
  | 'levelComplete'
  | 'dailyComplete'
  | 'taskComplete'
  | 'account'
  | 'explore'
  | 'profile'
  | 'docPatients'
  | 'docPatientDetail'
  | 'docRequests'
  | 'docProfile'
  | 'docPlans';
export type Exercise = 'repeat' | 'read' | 'chat' | 'breathing';

/** Which kind of account the sign-up flow is creating. Patients are the
 *  learners (often minors, who need guardian verification); therapists are the
 *  clinicians who manage them. */
export type UserType = 'patient' | 'therapist';

/** Handoff from SignUpScreen → VerifyEmailScreen: who just signed up and where
 *  the verification link was sent. Transient (not persisted); auth is mocked. */
export interface PendingVerification {
  userType: UserType;
  email: string;
  /** Patient under the guardian-required age → verification goes to a guardian. */
  isMinor: boolean;
  guardianEmail: string;
}

/** Identity captured on SignUpScreen, carried to the completion screen where the
 *  real POST /auth/signup fires (patient needs nickname, doctor needs
 *  qualification/bio, gathered later). Transient — never persisted. */
export interface SignupDraft {
  userType: UserType;
  firstName: string;
  lastName: string;
  email: string;
  dob: string; // YYYY-MM-DD
  gender: string; // UI label ('Female' / 'Male' / …)
  phone: string; // full number incl. dial code, or ''
  password: string;
}

/** Which experience the shared game (CompanionScreen) runs: free conversation
 *  ("Talk with Ollie") or guided repeat-after-me. Both launch the same game
 *  screen but differ in UI details and which APIs they call. */
export type GameMode = 'converse' | 'repeat';

/** Difficulty chosen on the Repeat-After-Me picker. Drives which set of
 *  questions the game fetches (from the API, later). Null for converse mode. */
export type GameDifficulty = 'easy' | 'medium' | 'hard' | 'twister';

/** The five practice games (matches the backend `exercise_type`). Repeat After Me,
 *  Read It Loud and Story Teller run through the difficulty picker; Picture Talk and
 *  Talk with Ollie run the free-conversation screen. */
export type ExerciseKind =
  | 'REPEAT_AFTER_ME'
  | 'READ_IT_LOUD'
  | 'STORY_TELLER'
  | 'PICTURE_TALK'
  | 'TALK_WITH_OLLIE';

export const EXERCISE_LABELS: Record<ExerciseKind, string> = {
  REPEAT_AFTER_ME: 'Repeat After Me',
  READ_IT_LOUD: 'Read It Loud',
  STORY_TELLER: 'Story Teller',
  PICTURE_TALK: 'Picture Talk',
  TALK_WITH_OLLIE: 'Talk with Ollie',
};

export interface Settings {
  sound: boolean;
  simpleMode: boolean;
}
export interface Progress {
  xp: number;
  stars: number;
  streakDays: number;
  lastActiveDate: string | null;
}
export interface Session {
  stars: number;
  attempts: number;
  byExercise: Record<Exercise, number>;
  words: string[];
}
/**
 * Result of the post-login 5-minute "say it back" check. Sets the child's level
 * and recommended daily practice minutes, which configure the other exercises.
 */
export interface AssessmentResult {
  level: number; // 1–5
  dailyMinutes: number; // recommended daily practice time
  phrasesCompleted: number;
  takenAt: string; // ISO timestamp
}

export interface AppState {
  screen: Screen;
  name: string;
  /** Chosen avatar id (see AVATARS in ProfileSetupScreen). */
  avatar: string;
  /** True once the patient has finished first-run profile setup. Gates whether
   *  login lands on the setup screen or straight on the dashboard. */
  profileComplete: boolean;
  settings: Settings;
  progress: Progress;
  session: Session;
  toast: string | null;
  /** Latest assessment (null until the first one is taken). */
  assessment: AssessmentResult | null;
  /** All past assessments, for progress tracking. */
  assessmentHistory: AssessmentResult[];
  /** Practice levels finished all-time (drives "You completed Level N"). */
  levelsCompleted: number;
  /** Practice levels finished today, and the day they count for. */
  levelsToday: number;
  levelDay: string | null;
  /** Whether the child has an assigned doctor/therapist. Comes from the login
   *  API in future; picks which landing-page variant the home screen shows. */
  hasDoctor: boolean;
  /** Which mode the shared game runs in, set when launching it from Home. */
  gameMode: GameMode;
  /** Chosen Repeat-After-Me difficulty (null for converse). */
  gameDifficulty: GameDifficulty | null;
  /** Which of the five games is currently active (for titles + which API to call). */
  currentGame: ExerciseKind;
  /** Plan item GUID when launched from the dashboard (planned exercise); null for
   *  free play. Threaded into the exercise start/content/attempt/end calls. */
  planItemId: string | null;
  /** Assigned minutes for a planned exercise (drives the countdown timer); null
   *  for free play or when no duration was set. */
  planItemDuration: number | null;
  /** Set on sign-up, read by the email-verification screen. Null otherwise. */
  pendingVerification: PendingVerification | null;
  /** Identity draft from SignUpScreen, consumed by the completion screen's real
   *  POST /auth/signup. Null otherwise. */
  signupDraft: SignupDraft | null;
  /** Bearer token (mirrors localStorage via api/token). Null when logged out. */
  authToken: string | null;
  /** Signed-in user's role (from /auth/me). Persisted so a reloaded doctor boots
   *  straight to the clinician portal instead of the patient home. Null = logged out. */
  role: Role | null;
  /** The patient's chosen avatar image URL (from /auth/me). Null for doctors / none. */
  avatarUrl: string | null;
  /** How the therapist screen was opened: 'explore' = browse the directory
   *  directly; 'mine' = show the assigned therapist (or browse if none). */
  therapistView: 'explore' | 'mine';
  /** Doctor portal: the patient whose overview is open (id + name for an instant
   *  header while the full clinical detail loads). Null when none is selected. */
  docPatient: { id: string; name: string } | null;
}

const XP_PER_LEVEL = 100;
export const levelFromXp = (xp: number): number => Math.floor(xp / XP_PER_LEVEL) + 1;
export const levelProgress = (xp: number): number => (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
/** XP into the current level tier, and the XP total at the next tier. */
export const xpIntoLevel = (xp: number): number => xp % XP_PER_LEVEL;
export const xpForNextLevel = (xp: number): number =>
  (Math.floor(xp / XP_PER_LEVEL) + 1) * XP_PER_LEVEL;

/** Reward for finishing one practice level (mock economy). */
export const LEVEL_XP_REWARD = 50;
export const LEVEL_STAR_REWARD = 10;
/** Practice levels that make up a day's goal (the "daily mission"). */
export const DAILY_GOAL_LEVELS = 3;

/** Map phrases completed in the 5-min check → a level (1–5). Tunable mock until
 *  the ML scoring backend lands. */
export function levelFromPhraseCount(count: number): number {
  if (count >= 16) return 5;
  if (count >= 12) return 4;
  if (count >= 8) return 3;
  if (count >= 4) return 2;
  return 1;
}
/** Recommended daily practice minutes for a level. Tunable mock. */
export function dailyMinutesForLevel(level: number): number {
  return [10, 15, 20, 25, 30][Math.min(4, Math.max(0, level - 1))];
}

const STORAGE_KEY = 'languageai.v1';
const dayKey = (d: Date): string => d.toISOString().slice(0, 10);

const emptySession = (): Session => ({
  stars: 0,
  attempts: 0,
  byExercise: { repeat: 0, read: 0, chat: 0, breathing: 0 },
  words: [],
});

interface Persisted {
  name: string;
  avatar: string;
  profileComplete: boolean;
  settings: Settings;
  progress: Progress;
  assessment: AssessmentResult | null;
  assessmentHistory: AssessmentResult[];
  levelsCompleted: number;
  levelsToday: number;
  levelDay: string | null;
  hasDoctor: boolean;
  role: Role | null;
}

const SCREENS: Screen[] = [
  'login',
  'signup',
  'verifyEmail',
  'profileSetup',
  'therapistSetup',
  'onboardingComplete',
  'quickStart',
  'home',
  'repeatSelect',
  'read',
  'chat',
  'breathing',
  'summary',
  'companion',
  'assessment',
  'levelComplete',
  'dailyComplete',
  'taskComplete',
  'account',
  'explore',
  'profile',
  'docPatients',
  'docPatientDetail',
  'docRequests',
  'docProfile',
  'docPlans',
];

/** Dev/QA: `?screen=home` boots straight to a given screen for previewing,
 *  bypassing the login flow. Returns null for an absent/unknown value. */
function readScreenOverride(): Screen | null {
  try {
    if (typeof location === 'undefined') return null;
    const v = new URLSearchParams(location.search).get('screen') as Screen | null;
    return v && SCREENS.includes(v) ? v : null;
  } catch {
    return null;
  }
}

/** Dev/QA override for the landing-page variant: `?doctor=1` forces the
 *  with-doctor screen, `?doctor=0` the no-doctor one. Returns null when absent,
 *  so the persisted / default value is used. Replaced by the login API later. */
function readDoctorOverride(): boolean | null {
  try {
    if (typeof location === 'undefined') return null;
    const v = new URLSearchParams(location.search).get('doctor');
    if (v === '1' || v === 'true') return true;
    if (v === '0' || v === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

function loadPersisted(): Persisted | null {
  try {
    // Dev/QA: opening the app with `?reset` wipes saved progress so it returns to
    // the login + first-time assessment flow. The param is stripped afterward so a
    // normal reload doesn't keep clearing progress.
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('reset')) {
      localStorage.removeItem(STORAGE_KEY);
      const url = new URL(location.href);
      url.searchParams.delete('reset');
      history.replaceState(null, '', url.toString());
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

function makeInitialState(): AppState {
  const p = loadPersisted();
  const token = getToken();
  const role = p?.role ?? null;
  return {
    // A saved token means "stay logged in" — boot to the right home for the role
    // (doctors → clinician portal). A stale token will 401 on the first call and
    // route back to login automatically.
    screen:
      readScreenOverride() ??
      (token ? (role === 'DOCTOR' ? 'docPatients' : 'home') : 'login'),
    name: p?.name ?? '',
    avatar: p?.avatar ?? 'lion',
    profileComplete: p?.profileComplete ?? false,
    settings: p?.settings ?? { sound: true, simpleMode: false },
    progress: p?.progress ?? { xp: 0, stars: 0, streakDays: 0, lastActiveDate: null },
    session: emptySession(),
    toast: null,
    assessment: p?.assessment ?? null,
    assessmentHistory: p?.assessmentHistory ?? [],
    levelsCompleted: p?.levelsCompleted ?? 0,
    levelsToday: p?.levelsToday ?? 0,
    levelDay: p?.levelDay ?? null,
    hasDoctor: readDoctorOverride() ?? p?.hasDoctor ?? true,
    gameMode: 'converse',
    gameDifficulty: null,
    currentGame: 'TALK_WITH_OLLIE',
    planItemId: null,
    planItemDuration: null,
    pendingVerification: null,
    signupDraft: null,
    authToken: token,
    role,
    avatarUrl: null,
    therapistView: 'explore',
    docPatient: null,
  };
}

type Action =
  | { type: 'navigate'; screen: Screen }
  | {
      type: 'startGame';
      mode: GameMode;
      difficulty?: GameDifficulty | null;
      game?: ExerciseKind;
      planItemId?: string | null;
      planItemDuration?: number | null;
    }
  | { type: 'setCurrentGame'; game: ExerciseKind }
  | { type: 'setName'; name: string }
  | { type: 'completeProfile'; name: string; avatar: string; hasDoctor: boolean }
  | { type: 'setProfileComplete'; value: boolean }
  | { type: 'setPendingVerification'; value: PendingVerification | null }
  | { type: 'setSignupDraft'; value: SignupDraft | null }
  | { type: 'setAuthToken'; value: string | null }
  | { type: 'setRole'; value: Role | null }
  | { type: 'setAvatarUrl'; value: string | null }
  | { type: 'setTherapistView'; value: 'explore' | 'mine' }
  | { type: 'setDocPatient'; value: { id: string; name: string } | null }
  | { type: 'setHasDoctor'; value: boolean }
  | { type: 'toggleSound' }
  | { type: 'toggleSimple' }
  | { type: 'award'; xp: number; stars: number; exercise: Exercise; word?: string; message?: string }
  | { type: 'completeAssessment'; result: AssessmentResult }
  | { type: 'clearAssessment' }
  | { type: 'completeLevel' }
  | { type: 'dismissToast' }
  | { type: 'resetSession' };

function bumpStreak(prev: Progress): Progress {
  const today = dayKey(new Date());
  if (prev.lastActiveDate === today) return prev;
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));
  const streakDays = prev.lastActiveDate === yesterday ? prev.streakDays + 1 : 1;
  return { ...prev, streakDays, lastActiveDate: today };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'navigate':
      return { ...state, screen: action.screen };
    case 'startGame':
      return {
        ...state,
        gameMode: action.mode,
        gameDifficulty: action.difficulty ?? null,
        currentGame: action.game ?? state.currentGame,
        planItemId: action.planItemId ?? null, // null unless launched from a plan
        planItemDuration: action.planItemDuration ?? null,
        screen: 'companion',
      };
    case 'setCurrentGame':
      return { ...state, currentGame: action.game };
    case 'setName':
      return { ...state, name: action.name };
    case 'completeProfile':
      return {
        ...state,
        name: action.name,
        avatar: action.avatar,
        hasDoctor: action.hasDoctor,
        profileComplete: true,
      };
    case 'setProfileComplete':
      return { ...state, profileComplete: action.value };
    case 'setPendingVerification':
      return { ...state, pendingVerification: action.value };
    case 'setSignupDraft':
      return { ...state, signupDraft: action.value };
    case 'setAuthToken':
      return { ...state, authToken: action.value };
    case 'setRole':
      return { ...state, role: action.value };
    case 'setAvatarUrl':
      return { ...state, avatarUrl: action.value };
    case 'setTherapistView':
      return { ...state, therapistView: action.value };
    case 'setDocPatient':
      return { ...state, docPatient: action.value };
    case 'setHasDoctor':
      return { ...state, hasDoctor: action.value };
    case 'toggleSound':
      return { ...state, settings: { ...state.settings, sound: !state.settings.sound } };
    case 'toggleSimple':
      return { ...state, settings: { ...state.settings, simpleMode: !state.settings.simpleMode } };
    case 'completeAssessment':
      return {
        ...state,
        assessment: action.result,
        assessmentHistory: [...state.assessmentHistory, action.result],
      };
    case 'clearAssessment':
      return { ...state, assessment: null };
    case 'completeLevel': {
      const today = dayKey(new Date());
      const streaked = bumpStreak(state.progress);
      const progress: Progress = {
        ...streaked,
        xp: streaked.xp + LEVEL_XP_REWARD,
        stars: streaked.stars + LEVEL_STAR_REWARD,
      };
      const baseToday = state.levelDay === today ? state.levelsToday : 0;
      return {
        ...state,
        progress,
        levelsCompleted: state.levelsCompleted + 1,
        levelsToday: baseToday + 1,
        levelDay: today,
      };
    }
    case 'dismissToast':
      return { ...state, toast: null };
    case 'resetSession':
      return { ...state, session: emptySession() };
    case 'award': {
      const streaked = bumpStreak(state.progress);
      const progress: Progress = {
        ...streaked,
        xp: streaked.xp + action.xp,
        stars: streaked.stars + action.stars,
      };
      const ex = action.exercise;
      const words =
        action.word && !state.session.words.includes(action.word)
          ? [...state.session.words, action.word]
          : state.session.words;
      const session: Session = {
        stars: state.session.stars + action.stars,
        attempts: state.session.attempts + 1,
        byExercise: { ...state.session.byExercise, [ex]: state.session.byExercise[ex] + 1 },
        words,
      };
      return { ...state, progress, session, toast: action.message ?? null };
    }
    default:
      return state;
  }
}

export interface AppApi {
  state: AppState;
  navigate: (screen: Screen) => void;
  /** Launch the shared game in a given mode + difficulty, optionally setting which
   *  game it is and (for planned play) the plan item GUID. */
  startGame: (
    mode: GameMode,
    difficulty?: GameDifficulty | null,
    game?: ExerciseKind,
    planItemId?: string | null,
    planItemDuration?: number | null,
  ) => void;
  /** Set the active game (e.g. before navigating to the difficulty picker). */
  setCurrentGame: (game: ExerciseKind) => void;
  setName: (name: string) => void;
  /** Save first-run profile setup (nickname, avatar, therapist connection). */
  completeProfile: (input: { name: string; avatar: string; hasDoctor: boolean }) => void;
  /** Flag first-run onboarding as done (therapist setup uses this). */
  setProfileComplete: (value: boolean) => void;
  /** Record who just signed up, for the email-verification screen. */
  setPendingVerification: (value: PendingVerification | null) => void;
  /** Stash the SignUpScreen identity draft for the completion-screen signup. */
  setSignupDraft: (value: SignupDraft | null) => void;
  /** Mirror the stored bearer token into state (call after login). */
  setAuthToken: (value: string | null) => void;
  /** Persist the signed-in user's role (call after login, from /auth/me). */
  setRole: (value: Role | null) => void;
  /** Set the patient's avatar image URL (from /auth/me or after editing). */
  setAvatarUrl: (value: string | null) => void;
  /** Set how the therapist screen opens ('explore' browse vs 'mine' assigned). */
  setTherapistView: (value: 'explore' | 'mine') => void;
  /** Doctor portal: select which patient's overview to open (id + name). */
  setDocPatient: (value: { id: string; name: string } | null) => void;
  /** Clear the token and return to the login screen. */
  logout: () => void;
  /** Set whether the child has a doctor (drives the landing-page variant). */
  setHasDoctor: (value: boolean) => void;
  toggleSound: () => void;
  toggleSimple: () => void;
  award: (input: { xp: number; stars: number; exercise: Exercise; word?: string; message?: string }) => void;
  completeAssessment: (result: AssessmentResult) => void;
  clearAssessment: () => void;
  /** Record finishing one practice level (awards XP/stars, bumps counters). */
  completeLevel: () => void;
  dismissToast: () => void;
  resetSession: () => void;
}

const AppContext = createContext<AppApi | null>(null);

export function AppProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);

  // A 401 anywhere (expired/invalid token) → clear auth state and go to login.
  useEffect(() => {
    const onUnauthorized = (): void => {
      dispatch({ type: 'setAuthToken', value: null });
      dispatch({ type: 'setRole', value: null });
      dispatch({ type: 'navigate', screen: 'login' });
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  // Persist the durable slice whenever it changes.
  useEffect(() => {
    const toSave: Persisted = {
      name: state.name,
      avatar: state.avatar,
      profileComplete: state.profileComplete,
      settings: state.settings,
      progress: state.progress,
      assessment: state.assessment,
      assessmentHistory: state.assessmentHistory,
      levelsCompleted: state.levelsCompleted,
      levelsToday: state.levelsToday,
      levelDay: state.levelDay,
      hasDoctor: state.hasDoctor,
      role: state.role,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      /* storage unavailable (private mode) — ignore */
    }
  }, [
    state.name,
    state.avatar,
    state.profileComplete,
    state.settings,
    state.progress,
    state.assessment,
    state.assessmentHistory,
    state.levelsCompleted,
    state.levelsToday,
    state.levelDay,
    state.hasDoctor,
    state.role,
  ]);

  const api = useMemo<AppApi>(
    () => ({
      state,
      navigate: (screen) => dispatch({ type: 'navigate', screen }),
      startGame: (mode, difficulty, game, planItemId, planItemDuration) =>
        dispatch({ type: 'startGame', mode, difficulty, game, planItemId, planItemDuration }),
      setCurrentGame: (game) => dispatch({ type: 'setCurrentGame', game }),
      setName: (name) => dispatch({ type: 'setName', name }),
      completeProfile: (input) => dispatch({ type: 'completeProfile', ...input }),
      setProfileComplete: (value) => dispatch({ type: 'setProfileComplete', value }),
      setPendingVerification: (value) => dispatch({ type: 'setPendingVerification', value }),
      setSignupDraft: (value) => dispatch({ type: 'setSignupDraft', value }),
      setAuthToken: (value) => dispatch({ type: 'setAuthToken', value }),
      setRole: (value) => dispatch({ type: 'setRole', value }),
      setAvatarUrl: (value) => dispatch({ type: 'setAvatarUrl', value }),
      setTherapistView: (value) => dispatch({ type: 'setTherapistView', value }),
      setDocPatient: (value) => dispatch({ type: 'setDocPatient', value }),
      logout: () => {
        clearToken();
        dispatch({ type: 'setAuthToken', value: null });
        dispatch({ type: 'setRole', value: null });
        dispatch({ type: 'navigate', screen: 'login' });
      },
      setHasDoctor: (value) => dispatch({ type: 'setHasDoctor', value }),
      toggleSound: () => dispatch({ type: 'toggleSound' }),
      toggleSimple: () => dispatch({ type: 'toggleSimple' }),
      award: (input) => dispatch({ type: 'award', ...input }),
      completeAssessment: (result) => dispatch({ type: 'completeAssessment', result }),
      clearAssessment: () => dispatch({ type: 'clearAssessment' }),
      completeLevel: () => dispatch({ type: 'completeLevel' }),
      dismissToast: () => dispatch({ type: 'dismissToast' }),
      resetSession: () => dispatch({ type: 'resetSession' }),
    }),
    [state],
  );

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}

export function useApp(): AppApi {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}

/** Levels completed today *after* the next one finishes (handles day rollover). */
export function levelsTodayAfterNext(state: AppState): number {
  const today = dayKey(new Date());
  const base = state.levelDay === today ? state.levelsToday : 0;
  return base + 1;
}
