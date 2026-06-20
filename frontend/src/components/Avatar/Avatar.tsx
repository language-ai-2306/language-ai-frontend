/**
 * Avatar — an animated SVG humanoid character (Talking-Tom style).
 *
 * - `mouthOpen` (0..1) drives lip-sync while speaking.
 * - `mood` sets the resting expression (eyebrows, cheeks, closed-mouth shape).
 * - `state` toggles idle bob vs. a "thinking" indicator.
 *
 * Pure presentational + memoized: it re-renders ~16fps from mouthOpen while the
 * avatar talks, so we keep the markup cheap and avoid creating handlers in JSX.
 */
import { memo } from 'react';

import type { AvatarState, Mood } from '../../types';
import './Avatar.css';

export interface AvatarProps {
  mood: Mood;
  state: AvatarState;
  /** 0 = closed, 1 = wide open. */
  mouthOpen: number;
}

/** Eyebrow group transform per mood (translate/rotate for emotion). */
const BROW_TRANSFORM: Record<Mood, { left: string; right: string }> = {
  neutral: { left: '', right: '' },
  happy: { left: 'translate(0,-3)', right: 'translate(0,-3)' },
  excited: { left: 'translate(0,-7)', right: 'translate(0,-7)' },
  thinking: { left: 'translate(0,-8) rotate(-8 75 74)', right: 'rotate(6 125 74)' },
  sad: { left: 'rotate(14 75 76)', right: 'rotate(-14 125 76)' },
};

/** Pupil gaze offset per mood. */
const GAZE: Record<Mood, { dx: number; dy: number }> = {
  neutral: { dx: 0, dy: 0 },
  happy: { dx: 0, dy: 1 },
  excited: { dx: 0, dy: -1 },
  thinking: { dx: 5, dy: -4 },
  sad: { dx: 0, dy: 3 },
};

/** Closed-mouth path per mood (used when the avatar is not actively talking). */
const MOUTH_REST: Record<Mood, string> = {
  neutral: 'M82 156 Q100 164 118 156',
  happy: 'M76 152 Q100 176 124 152',
  excited: 'M78 152 Q100 180 122 152',
  thinking: 'M90 158 Q100 154 110 160',
  sad: 'M78 164 Q100 148 122 164',
};

const CHEEK_OPACITY: Record<Mood, number> = {
  neutral: 0,
  happy: 0.55,
  excited: 0.7,
  thinking: 0,
  sad: 0.15,
};

function AvatarComponent({ mood, state, mouthOpen }: AvatarProps): JSX.Element {
  const talking = mouthOpen > 0.08;
  // Open-mouth ellipse height scales with amplitude.
  const mouthRy = 3 + mouthOpen * 20;
  const gaze = GAZE[mood];
  const brow = BROW_TRANSFORM[mood];

  return (
    <div
      className={`avatar avatar--${state}`}
      role="img"
      aria-label={`Avatar feeling ${mood}${talking ? ', talking' : ''}`}
    >
      <svg viewBox="0 0 200 230" className="avatar__svg" aria-hidden="true">
        {/* Listening indicator — sound-wave rings pulsing behind the head */}
        {state === 'listening' && (
          <g className="avatar__listening">
            <circle cx="100" cy="116" r="90" />
            <circle cx="100" cy="116" r="90" />
          </g>
        )}

        {/* Thinking indicator */}
        {state === 'thinking' && (
          <g className="avatar__thinking">
            <circle cx="150" cy="40" r="4" />
            <circle cx="164" cy="30" r="5" />
            <circle cx="180" cy="22" r="6" />
          </g>
        )}

        {/* Ears */}
        <ellipse cx="32" cy="118" rx="12" ry="18" className="avatar__skin" />
        <ellipse cx="168" cy="118" rx="12" ry="18" className="avatar__skin" />

        {/* Head */}
        <ellipse cx="100" cy="115" rx="70" ry="80" className="avatar__skin" />

        {/* Hair */}
        <path
          d="M32 96 Q34 30 100 26 Q166 30 168 96 Q150 58 100 56 Q50 58 32 96 Z"
          className="avatar__hair"
        />

        {/* Cheeks */}
        <circle cx="58" cy="140" r="13" className="avatar__cheek" style={{ opacity: CHEEK_OPACITY[mood] }} />
        <circle cx="142" cy="140" r="13" className="avatar__cheek" style={{ opacity: CHEEK_OPACITY[mood] }} />

        {/* Eyebrows */}
        <path d="M58 78 Q75 70 92 78" className="avatar__brow" transform={brow.left} />
        <path d="M108 78 Q125 70 142 78" className="avatar__brow" transform={brow.right} />

        {/* Eyes (blink animation applied via CSS to this group) */}
        <g className="avatar__eyes">
          <ellipse cx="75" cy="102" rx="15" ry="19" className="avatar__eye-white" />
          <ellipse cx="125" cy="102" rx="15" ry="19" className="avatar__eye-white" />
          <circle cx={75 + gaze.dx} cy={102 + gaze.dy} r="7.5" className="avatar__pupil" />
          <circle cx={125 + gaze.dx} cy={102 + gaze.dy} r="7.5" className="avatar__pupil" />
          <circle cx={72 + gaze.dx} cy={99 + gaze.dy} r="2.5" className="avatar__glint" />
          <circle cx={122 + gaze.dx} cy={99 + gaze.dy} r="2.5" className="avatar__glint" />
        </g>

        {/* Nose */}
        <path d="M96 118 Q100 132 104 118" className="avatar__nose" />

        {/* Mouth: open ellipse while talking, expression curve at rest */}
        {talking ? (
          <g>
            <ellipse cx="100" cy="158" rx="22" ry={mouthRy} className="avatar__mouth-open" />
            {mouthOpen > 0.45 && (
              <ellipse cx="100" cy={158 + mouthRy * 0.4} rx="13" ry={mouthRy * 0.45} className="avatar__tongue" />
            )}
          </g>
        ) : (
          <path d={MOUTH_REST[mood]} className="avatar__mouth-rest" />
        )}
      </svg>
    </div>
  );
}

export const Avatar = memo(AvatarComponent);
