/**
 * LevelCompleteScreen — celebration shown after finishing one practice level.
 *
 * Per the brief it shows level *progression* (not a stars tally): the player's
 * current level, a progress bar toward the next level, and their XP. From here
 * they can start the next level, jump back to the quest map (home), or exit.
 */
import { House, Map, Play, Trophy } from 'lucide-react';

import { levelFromXp, levelProgress, useApp, xpForNextLevel } from '../store/AppStore';
import { Confetti } from './components/Confetti';
import './levelcomplete.css';

export function LevelCompleteScreen(): JSX.Element {
  const { state, navigate } = useApp();
  const { levelsCompleted, progress } = state;
  const xpLevel = levelFromXp(progress.xp);
  const pct = Math.round(levelProgress(progress.xp) * 100);
  const nextAt = xpForNextLevel(progress.xp);

  return (
    <div className="lc-screen">
      <Confetti />

      <div className="lc-content">
        <div className="lc-medal" aria-hidden="true">
          <span className="lc-medal__cap">LEVEL</span>
          <span className="lc-medal__num">{levelsCompleted}</span>
        </div>

        <h1 className="lc-title">
          Hurray! 🎉 You completed Level {levelsCompleted}!
        </h1>

        <div className="lc-card">
          <div className="lc-card__top">
            <span className="lc-card__label">
              <Trophy size={20} aria-hidden="true" /> Level Progress
            </span>
            <span className="lc-card__level">Lv {xpLevel}</span>
          </div>
          <div className="lc-bar">
            <span className="lc-bar__fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="lc-card__foot">
            <span>XP: {progress.xp}</span>
            <span>Next Level: {nextAt}</span>
          </div>
        </div>

        <button type="button" className="lc-btn lc-btn--next" onClick={() => navigate('companion')}>
          Next Level <Play size={18} fill="currentColor" aria-hidden="true" />
        </button>
        <button type="button" className="lc-btn lc-btn--map" onClick={() => navigate('home')}>
          Explore Map <Map size={18} aria-hidden="true" />
        </button>
        <button type="button" className="lc-btn lc-btn--exit" onClick={() => navigate('home')}>
          Exit <House size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
