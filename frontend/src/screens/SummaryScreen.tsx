/** Session summary — celebratory recap a parent or therapist can review. */
import { Avatar } from '../components/Avatar/Avatar';
import { Button, ScreenHeader } from '../components/ui/ui';
import { levelFromXp, useApp } from '../store/AppStore';

export function SummaryScreen(): JSX.Element {
  const { state, navigate, resetSession } = useApp();
  const { session, progress, name } = state;
  const level = levelFromXp(progress.xp);
  const who = name.trim() || 'friend';
  const did = session.attempts > 0;

  return (
    <div className="screen">
      <ScreenHeader title="Great job!" onBack={() => navigate('home')} />

      <div className="summary__hero">
        <Avatar mood="excited" state="idle" mouthOpen={0} />
        <div className="summary__bigstars">⭐ {session.stars}</div>
        <p className="speech">
          {did
            ? `Awesome work, ${who}! Look what you did today.`
            : `Ready when you are, ${who}! Pick an activity to start earning stars.`}
        </p>
      </div>

      <div className="summary-grid">
        <div className="stat">
          <div className="stat__value">{session.attempts}</div>
          <div className="stat__label">tries today</div>
        </div>
        <div className="stat">
          <div className="stat__value">{session.byExercise.repeat + session.byExercise.read}</div>
          <div className="stat__label">words & sentences</div>
        </div>
        <div className="stat">
          <div className="stat__value">🔥 {progress.streakDays}</div>
          <div className="stat__label">day streak</div>
        </div>
        <div className="stat">
          <div className="stat__value">Lv {level}</div>
          <div className="stat__label">level</div>
        </div>
      </div>

      {session.words.length > 0 && (
        <>
          <p className="hint">Practiced today:</p>
          <div className="chips">
            {session.words.map((w) => (
              <span key={w} className="chip">
                {w}
              </span>
            ))}
          </div>
        </>
      )}

      <p className="grown-up">👨‍👩‍👧 For a grown-up: {session.stars} stars earned this session.</p>

      <div className="controls-row">
        <Button variant="primary" size="lg" onClick={() => navigate('home')}>
          Keep practicing
        </Button>
        <Button
          variant="soft"
          size="md"
          onClick={() => {
            resetSession();
            navigate('home');
          }}
        >
          Start fresh
        </Button>
      </div>
    </div>
  );
}
