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

export type Screen = 'home' | 'repeat' | 'read' | 'chat' | 'breathing' | 'summary';
export type Exercise = 'repeat' | 'read' | 'chat' | 'breathing';

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
export interface AppState {
  screen: Screen;
  name: string;
  settings: Settings;
  progress: Progress;
  session: Session;
  toast: string | null;
}

const XP_PER_LEVEL = 100;
export const levelFromXp = (xp: number): number => Math.floor(xp / XP_PER_LEVEL) + 1;
export const levelProgress = (xp: number): number => (xp % XP_PER_LEVEL) / XP_PER_LEVEL;

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
}

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

function makeInitialState(): AppState {
  const p = loadPersisted();
  return {
    screen: 'home',
    name: p?.name ?? '',
    settings: p?.settings ?? { sound: true, simpleMode: false },
    progress: p?.progress ?? { xp: 0, stars: 0, streakDays: 0, lastActiveDate: null },
    session: emptySession(),
    toast: null,
  };
}

type Action =
  | { type: 'navigate'; screen: Screen }
  | { type: 'setName'; name: string }
  | { type: 'toggleSound' }
  | { type: 'toggleSimple' }
  | { type: 'award'; xp: number; stars: number; exercise: Exercise; word?: string; message?: string }
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
    case 'setName':
      return { ...state, name: action.name };
    case 'toggleSound':
      return { ...state, settings: { ...state.settings, sound: !state.settings.sound } };
    case 'toggleSimple':
      return { ...state, settings: { ...state.settings, simpleMode: !state.settings.simpleMode } };
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
  setName: (name: string) => void;
  toggleSound: () => void;
  toggleSimple: () => void;
  award: (input: { xp: number; stars: number; exercise: Exercise; word?: string; message?: string }) => void;
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
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      /* storage unavailable (private mode) — ignore */
    }
  }, [state.name, state.settings, state.progress]);

  const api = useMemo<AppApi>(
    () => ({
      state,
      navigate: (screen) => dispatch({ type: 'navigate', screen }),
      setName: (name) => dispatch({ type: 'setName', name }),
      toggleSound: () => dispatch({ type: 'toggleSound' }),
      toggleSimple: () => dispatch({ type: 'toggleSimple' }),
      award: (input) => dispatch({ type: 'award', ...input }),
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
