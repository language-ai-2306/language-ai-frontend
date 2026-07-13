/**
 * LeaderboardScreen — public school scoreboard, reachable WITHOUT logging in.
 *
 * Three columns, as specified: rank · player · fluency score. Backed by
 * GET /v1/leaderboard, the one endpoint that needs no bearer token (the screen is
 * listed in PUBLIC_SCREENS in App.tsx, and the path in PUBLIC_PATHS in client.ts —
 * both are required, or the auth guard bounces a logged-out visitor to login).
 *
 * A player who hasn't practised yet has NO fluency score — the API sends null and
 * we render a dash. Showing 0 would rank a child who has simply never played as
 * the worst speaker in the school.
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, Trophy } from 'lucide-react';

import { getLeaderboard, type LeaderboardEntry } from '../api/leaderboard';
import { ApiError } from '../api/client';
import { useApp } from '../store/AppStore';
import './leaderboard.css';

/**
 * Medal tint for the podium. Only a player with an actual score can medal — the
 * unscored all tie on the trailing rank, and handing them a bronze for never
 * having practised would be nonsense.
 */
const medal = (rank: number, score: number | null): string => {
  if (score === null) return '';
  if (rank === 1) return ' lb__rank--gold';
  if (rank === 2) return ' lb__rank--silver';
  if (rank === 3) return ' lb__rank--bronze';
  return '';
};

export function LeaderboardScreen(): JSX.Element {
  const { navigate } = useApp();
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    getLeaderboard()
      .then((r) => alive && setRows(r))
      .catch((e) =>
        alive && setError(e instanceof ApiError ? e.message : 'Could not load the leaderboard.'),
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="lb">
      {/* The room from the home screen, full-bleed, dimmed so the table reads. */}
      <div className="lb__room" aria-hidden="true" />
      <div className="lb__scrim" aria-hidden="true" />

      <div className="lb__inner">
        <button type="button" className="lb__back" onClick={() => navigate('landing')}>
          <ArrowLeft size={18} aria-hidden="true" /> Back
        </button>

        <header className="lb__head">
          <span className="lb__cup" aria-hidden="true"><Trophy size={26} /></span>
          <h1 className="lb__title">School Leaderboard</h1>
          <p className="lb__sub">Fluency scores across the school. Keep practising to climb!</p>
        </header>

        <div className="lb__card">
          <div className="lb__row lb__row--head" role="row">
            <span className="lb__col lb__col--rank">Rank</span>
            <span className="lb__col lb__col--name">Player</span>
            <span className="lb__col lb__col--score">Fluency</span>
          </div>

          {loading && (
            <>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="lb__row lb__row--skel" aria-hidden="true">
                  <span className="lb__skel lb__skel--rank" />
                  <span className="lb__skel lb__skel--name" />
                  <span className="lb__skel lb__skel--score" />
                </div>
              ))}
              <p className="lb__status">Loading scores…</p>
            </>
          )}

          {!loading && error && <p className="lb__status lb__status--err">{error}</p>}

          {!loading && !error && rows.length === 0 && (
            <p className="lb__status">No players yet. Be the first to practise!</p>
          )}

          {!loading &&
            !error &&
            rows.map((r) => (
              <div className="lb__row" key={`${r.rank}-${r.name}`}>
                <span className="lb__col lb__col--rank">
                  <b className={`lb__rank${medal(r.rank, r.fluency_score)}`}>{r.rank}</b>
                </span>
                <span className="lb__col lb__col--name">{r.name}</span>
                <span className="lb__col lb__col--score">
                  {r.fluency_score === null ? (
                    // Hasn't practised yet — no score exists to show.
                    <span className="lb__dash" title="No exercises completed yet">
                      —
                    </span>
                  ) : (
                    <b className="lb__score">{r.fluency_score.toFixed(1)}</b>
                  )}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
