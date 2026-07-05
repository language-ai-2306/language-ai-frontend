/** Breathing & pacing — a calm guided-breathing exercise (no timers/pressure).
 *  The pacer pattern comes from the backend technique registry so it's a single
 *  source of truth; completion is logged (and credits a plan session). */
import { useEffect, useMemo, useState } from 'react';

import { completeBreathing, getBreathingConfig, type BreathingPattern } from '../api/exercises';
import { Avatar } from '../components/Avatar/Avatar';
import { Button, ScreenHeader } from '../components/ui/ui';
import { useApp } from '../store/AppStore';

// Fallback pattern if the config fetch fails (matches the backend default).
const DEFAULT_PATTERN: BreathingPattern = { inhale_s: 4, hold_s: 2, exhale_s: 4, cycles: 5 };

export function BreathingScreen(): JSX.Element {
  const { navigate, award } = useApp();
  const [pattern, setPattern] = useState<BreathingPattern>(DEFAULT_PATTERN);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [breaths, setBreaths] = useState(0);

  // Pull the pacer timings from the backend (registry). Best-effort — the
  // default keeps the screen usable if the request fails.
  useEffect(() => {
    let alive = true;
    getBreathingConfig()
      .then((c) => alive && setPattern(c.pattern))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const PHASES = useMemo(
    () => [
      { label: 'Breathe in', ms: pattern.inhale_s * 1000, scale: 1.45 },
      { label: 'Hold', ms: pattern.hold_s * 1000, scale: 1.45 },
      { label: 'Breathe out', ms: pattern.exhale_s * 1000, scale: 0.78 },
    ],
    [pattern],
  );

  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => {
      setPhase((p) => {
        const next = (p + 1) % PHASES.length;
        if (next === 0) setBreaths((b) => b + 1);
        return next;
      });
    }, PHASES[phase].ms);
    return () => window.clearTimeout(id);
  }, [running, phase, PHASES]);

  const current = PHASES[phase];
  const circleStyle = {
    transform: `scale(${running ? current.scale : 1})`,
    transitionDuration: `${running ? current.ms : 600}ms`,
  };

  const done = breaths >= pattern.cycles;

  const finish = (): void => {
    // Log completion (best-effort; free-play warm-up has no plan item).
    void completeBreathing().catch(() => undefined);
    award({ xp: 15, stars: 1, exercise: 'breathing', message: 'Nice and calm! 🌿' });
    navigate('home');
  };

  return (
    <div className="screen">
      <ScreenHeader title="Breathe & relax" onBack={() => navigate('home')} />

      <div className="stage">
        <Avatar mood="neutral" state="idle" mouthOpen={0} />
      </div>

      <div className="breath">
        <div className="breath__orb">
          <div className="breath__circle" style={circleStyle}>
            <span className="breath__label">{running ? current.label : 'Ready?'}</span>
          </div>
        </div>
        <p className="breath__count">
          {breaths} / {pattern.cycles} calm breaths{done ? ' — all done! 🌟' : ''}
        </p>
        <p className="hint">
          Breathe slowly with the circle. When you talk, start gently — easy and relaxed.
        </p>
      </div>

      <div className="controls-row">
        <Button variant="primary" size="lg" onClick={() => setRunning((r) => !r)}>
          {running ? '⏸ Pause' : '▶ Start'}
        </Button>
        <Button variant="success" size="lg" onClick={finish}>
          {done ? 'All done! 🌿' : 'I feel calm 🌿'}
        </Button>
      </div>
    </div>
  );
}
