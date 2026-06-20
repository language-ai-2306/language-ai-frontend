/** Breathing & pacing — a calm guided-breathing exercise (no timers/pressure). */
import { useEffect, useState } from 'react';

import { Avatar } from '../components/Avatar/Avatar';
import { Button, ScreenHeader } from '../components/ui/ui';
import { useApp } from '../store/AppStore';

const PHASES = [
  { label: 'Breathe in', ms: 4000, scale: 1.45 },
  { label: 'Hold', ms: 3000, scale: 1.45 },
  { label: 'Breathe out', ms: 6000, scale: 0.78 },
] as const;

export function BreathingScreen(): JSX.Element {
  const { navigate, award } = useApp();
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [breaths, setBreaths] = useState(0);

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
  }, [running, phase]);

  const current = PHASES[phase];
  const circleStyle = {
    transform: `scale(${running ? current.scale : 1})`,
    transitionDuration: `${running ? current.ms : 600}ms`,
  };

  const finish = (): void => {
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
        <p className="breath__count">{breaths} calm breaths</p>
        <p className="hint">
          Breathe slowly with the circle. When you talk, start gently — easy and relaxed.
        </p>
      </div>

      <div className="controls-row">
        <Button variant="primary" size="lg" onClick={() => setRunning((r) => !r)}>
          {running ? '⏸ Pause' : '▶ Start'}
        </Button>
        <Button variant="success" size="lg" onClick={finish}>
          I feel calm 🌿
        </Button>
      </div>
    </div>
  );
}
