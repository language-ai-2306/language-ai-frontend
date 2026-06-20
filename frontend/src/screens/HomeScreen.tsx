/** Home hub — greeting, gamified stats, and the activity launcher. */
import { Avatar } from '../components/Avatar/Avatar';
import { Button, ProgressBar, Tile } from '../components/ui/ui';
import { levelFromXp, levelProgress, useApp } from '../store/AppStore';

export function HomeScreen(): JSX.Element {
  const { state, navigate, setName, toggleSound, toggleSimple } = useApp();
  const { progress, settings, name } = state;
  const level = levelFromXp(progress.xp);

  return (
    <div className="screen">
      <div className="home__hero">
        <Avatar mood="happy" state="idle" mouthOpen={0} />
        <h1 className="home__greeting">Hi {name.trim() || 'friend'}! 👋</h1>
        {!settings.simpleMode && <p className="home__sub">Let&apos;s practice talking together.</p>}
      </div>

      <div className="level-row">
        <div className="level-row__top">
          <span>Level {level}</span>
          <span>⭐ {progress.stars}</span>
        </div>
        <ProgressBar value={levelProgress(progress.xp)} label={`Level ${level} progress`} />
      </div>

      <div className="home__stats">
        <div className="statcard">
          <div className="statcard__value">🔥 {progress.streakDays}</div>
          <div className="statcard__label">day streak</div>
        </div>
        <div className="statcard">
          <div className="statcard__value">⭐ {progress.stars}</div>
          <div className="statcard__label">stars</div>
        </div>
        <div className="statcard">
          <div className="statcard__value">{level}</div>
          <div className="statcard__label">level</div>
        </div>
      </div>

      <div className="home__grid">
        <Tile
          icon="🦜"
          title="Repeat after me"
          subtitle={settings.simpleMode ? undefined : 'Say it back'}
          accent="violet"
          onClick={() => navigate('repeat')}
        />
        <Tile
          icon="📖"
          title="Read aloud"
          subtitle={settings.simpleMode ? undefined : 'Read a sentence'}
          accent="green"
          onClick={() => navigate('read')}
        />
        <Tile
          icon="💬"
          title="Let's chat"
          subtitle={settings.simpleMode ? undefined : 'Talk freely'}
          accent="sky"
          onClick={() => navigate('chat')}
        />
        <Tile
          icon="🌬️"
          title="Breathe & relax"
          subtitle={settings.simpleMode ? undefined : 'Calm breathing'}
          accent="amber"
          onClick={() => navigate('breathing')}
        />
      </div>

      <div className="home__footer">
        <div className="name-row">
          <label htmlFor="player-name" className="hint">
            My name:
          </label>
          <input
            id="player-name"
            className="name-input"
            type="text"
            value={name}
            maxLength={20}
            placeholder="type your name"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <Button variant="soft" size="md" onClick={() => navigate('summary')}>
          ⭐ My progress
        </Button>

        <div className="toggles">
          <button
            type="button"
            className="toggle"
            aria-pressed={settings.sound}
            onClick={toggleSound}
          >
            {settings.sound ? '🔊' : '🔇'} Sound
          </button>
          <button
            type="button"
            className="toggle"
            aria-pressed={settings.simpleMode}
            onClick={toggleSimple}
          >
            🅰️ Simple mode
          </button>
        </div>
      </div>
    </div>
  );
}
