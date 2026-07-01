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

export type Screen =
  | 'login'
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
  | 'dailyComplete';
export type Exercise = 'repeat' | 'read' | 'chat' | 'breathing';

/** Which experience the shared game (CompanionScreen) runs: free conversation
 *  ("Talk with Ollie") or guided repeat-after-me. Both launch the same game
 *  screen but differ in UI details and which APIs they call. */
export type GameMode = 'converse' | 'repeat';

/** Difficulty chosen on the Repeat-After-Me picker. Drives which set of
 *  questions the game fetches (from the API, later). Null for converse mode. */
export type GameDifficulty = 'easy' | 'medium' | 'hard' | 'twister';

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
  settings: Settings;
  progress: Progress;
  assessment: AssessmentResult | null;
  assessmentHistory: AssessmentResult[];
  levelsCompleted: number;
  levelsToday: number;
  levelDay: string | null;
  hasDoctor: boolean;
}

const SCREENS: Screen[] = [
  'login',
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
  return {
    screen: readScreenOverride() ?? 'login',
    name: p?.name ?? '',
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
  };
}

type Action =
  | { type: 'navigate'; screen: Screen }
  | { type: 'startGame'; mode: GameMode; difficulty?: GameDifficulty | null }
  | { type: 'setName'; name: string }
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
        screen: 'companion',
      };
    case 'setName':
      return { ...state, name: action.name };
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
  /** Launch the shared game (CompanionScreen) in a given mode + difficulty. */
  startGame: (mode: GameMode, difficulty?: GameDifficulty | null) => void;
  setName: (name: string) => void;
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

  // Persist the durable slice whenever it changes.
  useEffect(() => {
    const toSave: Persisted = {
      name: state.name,
      settings: state.settings,
      progress: state.progress,
      assessment: state.assessment,
      assessmentHistory: state.assessmentHistory,
      levelsCompleted: state.levelsCompleted,
      levelsToday: state.levelsToday,
      levelDay: state.levelDay,
      hasDoctor: state.hasDoctor,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      /* storage unavailable (private mode) — ignore */
    }
  }, [
    state.name,
    state.settings,
    state.progress,
    state.assessment,
    state.assessmentHistory,
    state.levelsCompleted,
    state.levelsToday,
    state.levelDay,
    state.hasDoctor,
  ]);

  const api = useMemo<AppApi>(
    () => ({
      state,
      navigate: (screen) => dispatch({ type: 'navigate', screen }),
      startGame: (mode, difficulty) => dispatch({ type: 'startGame', mode, difficulty }),
      setName: (name) => dispatch({ type: 'setName', name }),
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
