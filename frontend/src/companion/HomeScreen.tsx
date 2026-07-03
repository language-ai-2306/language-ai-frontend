/**
 * HomeScreen — "Learning Quest" landing hub, shown after login + the quick check.
 *
 * Two variants, keyed on `state.hasDoctor` (from the login API in future):
 *   • With a doctor    → daily + weekly mission cards, then Continue Journey.
 *   • Without a doctor  → Continue Journey + an "Explore Therapists" CTA.
 *
 * Layout: the 3D companion stands in its own white hero (disconnected from the
 * menu), with a lavender content sheet below holding the missions/actions. The
 * character is reused (idle) so it preloads and the practice screens open fast.
 */
import { Suspense, useEffect, useRef, useState } from 'react';
import { BookOpen, Image, Palette, PawPrint, Play, ScrollText } from 'lucide-react';

import { me } from '../api/auth';
import { getDashboard, type Dashboard, type DashboardItem } from '../api/dashboard';
import { getMyDoctor } from '../api/doctors';
import { AvatarImage } from './components/AvatarImage';
import {
  EXERCISE_LABELS,
  useApp,
  type ExerciseKind,
  type GameMode,
} from '../store/AppStore';
import { AvatarStage } from './components/AvatarStage';
import { BirdLoader } from './components/BirdLoader';
import { HOME_CAMERA } from './three/avatarConfig';
import './home.css';

/** A circular progress ring with a `value / total` label in its centre. */
function MissionRing({ value, total }: { value: number; total: number }): JSX.Element {
  const R = 34;
  const C = 2 * Math.PI * R;
  const frac = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <div className="lq-ring">
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle className="lq-ring__track" cx="40" cy="40" r={R} />
        <circle
          className="lq-ring__fill"
          cx="40"
          cy="40"
          r={R}
          strokeDasharray={`${C * frac} ${C}`}
          transform="rotate(-90 40 40)"
        />
      </svg>
      <span className="lq-ring__label">
        <b>{value}</b>/{total}
      </span>
    </div>
  );
}

const DIFF_LABEL: Record<string, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
  TONGUE_TWISTER: 'Tongue Twister',
};
const DAY_LABEL: Record<string, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
};

/** Playful emoji + accent colour per game (kid-friendly mission slides). */
const EX_ICON: Record<string, string> = {
  TALK_WITH_OLLIE: '🦊',
  REPEAT_AFTER_ME: '🎤',
  READ_IT_LOUD: '📖',
  PICTURE_TALK: '🎨',
  STORY_TELLER: '🏰',
};
const EX_ACCENT: Record<string, string> = {
  TALK_WITH_OLLIE: '#8ecf3c',
  REPEAT_AFTER_ME: '#4fbfe9',
  READ_IT_LOUD: '#f5a03c',
  PICTURE_TALK: '#ef6fb0',
  STORY_TELLER: '#a06ee8',
};

/** One exercise shown on a mission slide. */
interface MissionExercise {
  item_id: string;
  type: string; // raw exercise_type (for launching)
  name: string;
  difficulty: string | null;
  duration: number | null; // minutes
  days: string[] | null; // full weekday names — weekly only
  icon: string; // playful emoji
  accent: string; // accent colour
}

/** Celebration card shown when there's nothing left to do (all done / none due). */
function MissionDone({ label, message }: { label: string; message: string }): JSX.Element {
  return (
    <article className="lq-mission">
      <h3 className="lq-mission__label">{label}</h3>
      <div className="lq-mission__done">
        <span className="lq-mission__done-icon" aria-hidden="true">
          🎉
        </span>
        <p className="lq-mission__done-text">{message}</p>
      </div>
    </article>
  );
}

/**
 * A swipeable mission card: slide 0 is the progress ring, then one slide per
 * assigned exercise (name + difficulty + duration; + scheduled day for weekly).
 */
function MissionCarousel({
  label,
  value,
  total,
  caption,
  exercises,
  onAttempt,
}: {
  label: string;
  value: number;
  total: number;
  caption: string;
  exercises: MissionExercise[];
  /** When provided, each exercise slide gets a "Start" button (Today's Mission). */
  onAttempt?: (ex: MissionExercise) => void;
}): JSX.Element {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const slideCount = 1 + exercises.length;

  const onScroll = (): void => {
    const el = trackRef.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <article className="lq-mission">
      <h3 className="lq-mission__label">{label}</h3>
      <div className="lq-mission__track" ref={trackRef} onScroll={onScroll}>
        {/* Slide 0 — progress ring */}
        <div className="lq-mission__slide">
          <MissionRing value={value} total={total} />
          <p className="lq-mission__caption">{caption}</p>
        </div>
        {/* One slide per assigned exercise */}
        {exercises.map((ex) => (
          <div className="lq-mission__slide" key={ex.item_id}>
            <span className="lq-mission__ex-icon" style={{ background: ex.accent }}>
              {ex.icon}
            </span>
            <span className="lq-mission__ex-name">{ex.name}</span>
            <div className="lq-mission__ex-meta">
              {ex.difficulty && (
                <span className="lq-mission__pill lq-mission__pill--diff">{ex.difficulty}</span>
              )}
              {ex.duration != null && (
                <span className="lq-mission__pill">⏱️ {ex.duration} min</span>
              )}
            </div>
            {ex.days && ex.days.length > 0 && (
              <span className="lq-mission__day">📅 {ex.days.join(', ')}</span>
            )}
            {onAttempt && (
              <button
                type="button"
                className="lq-mission__go"
                style={{ background: ex.accent }}
                onClick={() => onAttempt(ex)}
              >
                <Play size={18} aria-hidden="true" /> Start
              </button>
            )}
          </div>
        ))}
      </div>
      {slideCount > 1 && (
        <span className="lq-dots" aria-hidden="true">
          {Array.from({ length: slideCount }).map((_, i) => (
            <i key={i} className={i === active ? 'is-active' : ''} />
          ))}
        </span>
      )}
    </article>
  );
}

export function HomeScreen(): JSX.Element {
  const { state, navigate, startGame, setCurrentGame, setHasDoctor, setName, setAvatarUrl, setTherapistView } =
    useApp();
  const firstName = state.name.trim() || 'friend';

  // Repeat After Me / Read It Loud / Story Teller share the difficulty picker;
  // set which game is active first, then open it.
  const openPicker = (game: 'REPEAT_AFTER_ME' | 'READ_IT_LOUD' | 'STORY_TELLER'): void => {
    setCurrentGame(game);
    navigate('repeatSelect');
  };

  // The patient's plan dashboard (today's tasks + weekly/today counts).
  const [dash, setDash] = useState<Dashboard | null>(null);
  useEffect(() => {
    let alive = true;
    getDashboard()
      .then((d) => {
        if (alive) setDash(d);
      })
      .catch(() => undefined); // no plan / not a patient → keep the default view
    return () => {
      alive = false;
    };
  }, []);
  const today: DashboardItem[] = dash?.today ?? [];

  // Reconcile the "has a therapist" flag with the backend (drives the landing
  // variant + the Explore / View-My-Therapist button).
  useEffect(() => {
    let alive = true;
    getMyDoctor()
      .then((d) => {
        if (alive) setHasDoctor(!!d);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydrate the profile (name + avatar) from the backend.
  useEffect(() => {
    let alive = true;
    me()
      .then((u) => {
        if (!alive) return;
        setName(u.first_name);
        setAvatarUrl(u.avatar_url ?? null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Missions use real plan counts when the dashboard has any; otherwise the cards
  // keep their default (mock) values.
  const hasTodayPlan = !!dash && dash.totalTasksToday > 0;
  const hasWeeklyPlan = !!dash && dash.totalTasksWeekly > 0;
  // With a loaded plan, "done today" = all today's tasks complete OR none assigned
  // (0 >= 0). Null dashboard keeps the default ring instead.
  const todayDone = !!dash && dash.completedTasksToday >= dash.totalTasksToday;

  const exName = (t: string): string => EXERCISE_LABELS[t as ExerciseKind] ?? t;
  const exDiff = (d?: string | null): string | null => (d ? (DIFF_LABEL[d] ?? d) : null);

  // Assigned exercises shown on the swipeable mission slides.
  const todayExercises: MissionExercise[] = today.map((it) => ({
    item_id: it.item_id,
    type: it.exercise_type,
    name: exName(it.exercise_type),
    difficulty: exDiff(it.difficulty),
    duration: it.duration_minutes ?? null,
    days: null, // today's mission is for today — no date shown
    icon: EX_ICON[it.exercise_type] ?? '⭐',
    accent: EX_ACCENT[it.exercise_type] ?? '#a06ee8',
  }));
  const weeklyExercises: MissionExercise[] = (dash?.weekly ?? []).map((it) => ({
    item_id: it.item_id,
    type: it.exercise_type,
    name: exName(it.exercise_type),
    difficulty: exDiff(it.difficulty),
    duration: it.duration_minutes ?? null,
    days: it.scheduled_days.map((d) => DAY_LABEL[d] ?? d),
    icon: EX_ICON[it.exercise_type] ?? '⭐',
    accent: EX_ACCENT[it.exercise_type] ?? '#a06ee8',
  }));

  // Launch a planned exercise: the plan supplies difficulty/phoneme, so it skips
  // the picker and runs with plan_item_id (session + /end on close).
  const launchPlanned = (ex: MissionExercise): void => {
    const game = ex.type as ExerciseKind;
    const mode: GameMode = game === 'TALK_WITH_OLLIE' || game === 'PICTURE_TALK' ? 'converse' : 'repeat';
    startGame(mode, null, game, ex.item_id, ex.duration);
  };

  return (
    <div className="lq-screen">
      <header className="lq-topbar">
        <div className="lq-brand">
          <span className="lq-brand__badge" aria-hidden="true">
            🦉
          </span>
          <span className="lq-brand__title">LanguageAI</span>
        </div>
        <button
          type="button"
          className="lq-profile"
          onClick={() => navigate('profile')}
          aria-label="Profile"
          title="Profile"
        >
          <AvatarImage url={state.avatarUrl} size={38} />
        </button>
      </header>

      <main className="lq-main">
        {/* Hero — the companion stands on a white background, separate from the
            menu below (per the reference layout). */}
        <section className="lq-hero">
          <div className="lq-bubble">
            <span className="lq-bubble__text">Hi {firstName}!</span>
          </div>
          <div className="lq-hero__stage">
            <Suspense fallback={<BirdLoader />}>
              <AvatarStage
                state="idle"
                mouthOpen={0}
                micActive={false}
                getLevel={() => 0}
                camera={HOME_CAMERA}
              />
            </Suspense>
          </div>
        </section>

        {/* Content sheet — missions (doctor users only) + Continue Journey. */}
        <section className="lq-content">
          {state.hasDoctor && (
            <div className="lq-missions">
              {todayDone ? (
                <MissionDone
                  label="Today's Mission"
                  message="Well done! You've completed all your work for today."
                />
              ) : (
                <MissionCarousel
                  label="Today's Mission"
                  value={hasTodayPlan ? dash!.completedTasksToday : 0}
                  total={hasTodayPlan ? dash!.totalTasksToday : 1}
                  caption="Ready to start?"
                  exercises={todayExercises}
                  onAttempt={(ex) => launchPlanned(ex)}
                />
              )}
              <MissionCarousel
                label="Weekly Mission"
                value={hasWeeklyPlan ? dash!.completedTasksWeekly : 2}
                total={hasWeeklyPlan ? dash!.totalTasksWeekly : 5}
                caption={
                  hasWeeklyPlan && dash!.completedTasksWeekly >= dash!.totalTasksWeekly
                    ? 'All done! 🎉'
                    : 'Keep it up!'
                }
                exercises={weeklyExercises}
              />
            </div>
          )}

          <h2 className="lq-journey__heading">Continue Journey</h2>
          <div className="lq-journey">
            <button
              type="button"
              className="lq-action lq-action--green"
              onClick={() => startGame('converse', null, 'TALK_WITH_OLLIE')}
            >
              <span className="lq-action__icon" aria-hidden="true">
                <PawPrint size={26} />
              </span>
              <span className="lq-action__label">Talk with Ollie</span>
            </button>
            <button
              type="button"
              className="lq-action lq-action--blue"
              onClick={() => openPicker('REPEAT_AFTER_ME')}
            >
              <span className="lq-action__icon" aria-hidden="true">
                <Palette size={26} />
              </span>
              <span className="lq-action__label">Repeat After Me</span>
            </button>
            <button
              type="button"
              className="lq-action lq-action--orange"
              onClick={() => openPicker('READ_IT_LOUD')}
            >
              <span className="lq-action__icon" aria-hidden="true">
                <BookOpen size={26} />
              </span>
              <span className="lq-action__label">Read It Loud</span>
            </button>
            <button
              type="button"
              className="lq-action lq-action--pink"
              onClick={() => startGame('converse', null, 'PICTURE_TALK')}
            >
              <span className="lq-action__icon" aria-hidden="true">
                <Image size={26} />
              </span>
              <span className="lq-action__label">Picture Talk</span>
            </button>
            <button
              type="button"
              className="lq-action lq-action--violet"
              onClick={() => openPicker('STORY_TELLER')}
            >
              <span className="lq-action__icon" aria-hidden="true">
                <ScrollText size={26} />
              </span>
              <span className="lq-action__label">Story Teller</span>
            </button>
          </div>

          {!state.hasDoctor && (
            <button
              type="button"
              className="lq-therapists"
              onClick={() => {
                setTherapistView('explore');
                navigate('explore');
              }}
            >
              Explore Therapists
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
