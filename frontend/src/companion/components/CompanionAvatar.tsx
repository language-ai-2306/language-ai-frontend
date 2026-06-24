/**
 * CompanionAvatar — "Pip", an original friendly mascot rendered as SVG.
 *
 * This is the illustrated fallback for the AvatarStage (used when no 3D GLB
 * model is present). It is original artwork — deliberately not modelled on any
 * commercial character. Animation is CSS-driven per state; while `speaking`,
 * the mouth opens proportionally to `mouthOpen` (0..1) for simple lip-sync.
 * During `listening` it gently reacts to the `--mic-level` CSS variable set by
 * the stage. Decorative — the live status text conveys state to assistive tech.
 */
import { memo } from 'react';

import type { AvatarState } from '../types';

export interface CompanionAvatarProps {
  state: AvatarState;
  /** 0 = closed, 1 = wide open. Only used while `speaking`. */
  mouthOpen: number;
}

/** Pupil gaze offset per state. */
const GAZE: Record<AvatarState, { x: number; y: number }> = {
  idle: { x: 0, y: 0 },
  speaking: { x: 0, y: 0 },
  listening: { x: 0, y: 1 },
  thinking: { x: 6, y: -5 },
  celebrating: { x: 0, y: -2 },
  encouraging: { x: 0, y: 1 },
};

/** Resting mouth path per state (used when not actively speaking). */
const MOUTH: Record<AvatarState, string> = {
  idle: 'M86 150 Q100 162 114 150',
  speaking: 'M86 150 Q100 162 114 150',
  listening: 'M88 150 Q100 160 112 150',
  thinking: 'M94 152 Q100 148 106 154',
  celebrating: 'M82 148 Q100 172 118 148',
  encouraging: 'M84 150 Q100 166 116 150',
};

const CHEEK_OPACITY: Record<AvatarState, number> = {
  idle: 0.5,
  speaking: 0.5,
  listening: 0.6,
  thinking: 0.25,
  celebrating: 0.8,
  encouraging: 0.65,
};

function CompanionAvatarComponent({ state, mouthOpen }: CompanionAvatarProps): JSX.Element {
  const talking = state === 'speaking' && mouthOpen > 0.08;
  const mouthRy = 3 + mouthOpen * 16;
  const gaze = GAZE[state];

  return (
    <svg className={`pip pip--${state}`} viewBox="0 0 200 220" aria-hidden="true" focusable="false">
      {/* Listening sound-rings behind the head */}
      <g className="pip__rings">
        <circle cx="100" cy="120" r="86" />
        <circle cx="100" cy="120" r="86" />
      </g>

      {/* Thinking dots */}
      <g className="pip__think">
        <circle cx="150" cy="44" r="4" />
        <circle cx="165" cy="34" r="5" />
        <circle cx="181" cy="25" r="6" />
      </g>

      {/* Celebration sparkles */}
      <g className="pip__sparkles">
        <path d="M40 70 l3 -8 3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 z" />
        <path d="M158 78 l2.5 -7 2.5 7 7 2.5 -7 2.5 -2.5 7 -2.5 -7 -7 -2.5 z" />
        <path d="M150 150 l2 -6 2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 z" />
      </g>

      {/* The mascot body — grouped so it can breathe / bounce as one */}
      <g className="pip__body">
        {/* Feet */}
        <ellipse cx="80" cy="196" rx="16" ry="9" className="pip__foot" />
        <ellipse cx="120" cy="196" rx="16" ry="9" className="pip__foot" />

        {/* Arms */}
        <ellipse className="pip__arm pip__arm--l" cx="44" cy="140" rx="11" ry="18" />
        <ellipse className="pip__arm pip__arm--r" cx="156" cy="140" rx="11" ry="18" />

        {/* Ears */}
        <ellipse cx="64" cy="58" rx="16" ry="22" className="pip__ear" />
        <ellipse cx="136" cy="58" rx="16" ry="22" className="pip__ear" />
        <ellipse cx="64" cy="60" rx="8" ry="12" className="pip__ear-inner" />
        <ellipse cx="136" cy="60" rx="8" ry="12" className="pip__ear-inner" />

        {/* Head + belly */}
        <ellipse cx="100" cy="120" rx="60" ry="62" className="pip__skin" />
        <ellipse cx="100" cy="134" rx="38" ry="42" className="pip__belly" />

        {/* Cheeks */}
        <circle cx="66" cy="132" r="9" className="pip__cheek" style={{ opacity: CHEEK_OPACITY[state] }} />
        <circle cx="134" cy="132" r="9" className="pip__cheek" style={{ opacity: CHEEK_OPACITY[state] }} />

        {/* Eyes */}
        <g className="pip__eyes">
          <ellipse cx="82" cy="110" rx="13" ry="16" className="pip__eye" />
          <ellipse cx="118" cy="110" rx="13" ry="16" className="pip__eye" />
          <circle cx={82 + gaze.x} cy={110 + gaze.y} r="6.5" className="pip__pupil" />
          <circle cx={118 + gaze.x} cy={110 + gaze.y} r="6.5" className="pip__pupil" />
          <circle cx={79 + gaze.x} cy={107 + gaze.y} r="2.2" className="pip__glint" />
          <circle cx={115 + gaze.x} cy={107 + gaze.y} r="2.2" className="pip__glint" />
        </g>

        {/* Mouth */}
        {talking ? (
          <ellipse cx="100" cy="152" rx="15" ry={mouthRy} className="pip__mouth-open" />
        ) : (
          <path d={MOUTH[state]} className="pip__mouth" />
        )}
      </g>
    </svg>
  );
}

export const CompanionAvatar = memo(CompanionAvatarComponent);
