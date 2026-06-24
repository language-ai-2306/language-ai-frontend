/**
 * MouthChart — a 2D cartoon mouth that forms the 9 Rhubarb/Preston-Blair viseme
 * shapes, so a child can watch how each sound is made. Driven by `useLipSync`.
 */
import type { MouthShape } from '../lipsync/useLipSync';

const LIP = '#d27384';
const OPEN = '#4a1d28';
const TEETH = '#ffffff';
const TONGUE = '#ef93a6';
const CX = 80;
const CY = 76;

interface ShapeCfg {
  rx: number;
  ry: number;
  closed?: boolean;
  pressed?: boolean;
  round?: boolean;
  teeth?: boolean;
  tongue?: boolean;
}

// Mouth geometry per viseme (see specs/PHONEMES_AND_LIPSYNC.md).
const CFG: Record<MouthShape, ShapeCfg> = {
  X: { rx: 32, ry: 4, closed: true }, // rest / silence
  A: { rx: 30, ry: 3, closed: true, pressed: true }, // p, b, m
  B: { rx: 34, ry: 9, teeth: true }, // many consonants
  C: { rx: 30, ry: 18 }, // eh, ae
  D: { rx: 28, ry: 33 }, // ah (wide)
  E: { rx: 26, ry: 23, round: true }, // aw
  F: { rx: 13, ry: 15, round: true }, // oo, w (pucker)
  G: { rx: 28, ry: 9, teeth: true }, // f, v
  H: { rx: 26, ry: 25, tongue: true }, // l
};

function renderShape(shape: MouthShape): JSX.Element {
  const c = CFG[shape];
  if (c.closed) {
    const dip = c.pressed ? 2 : 11; // A is pressed flat, X is a soft smile
    return (
      <path
        d={`M ${CX - c.rx} ${CY} Q ${CX} ${CY + dip} ${CX + c.rx} ${CY}`}
        fill="none"
        stroke={LIP}
        strokeWidth={c.pressed ? 13 : 9}
        strokeLinecap="round"
      />
    );
  }
  const pad = c.round ? 11 : 9;
  return (
    <g>
      <ellipse cx={CX} cy={CY} rx={c.rx + pad} ry={c.ry + pad} fill={LIP} />
      <ellipse cx={CX} cy={CY} rx={c.rx} ry={c.ry} fill={OPEN} />
      {c.teeth && (
        <rect
          x={CX - c.rx + 4}
          y={CY - c.ry}
          width={2 * (c.rx - 4)}
          height={Math.min(11, c.ry * 0.9)}
          rx={3}
          fill={TEETH}
        />
      )}
      {c.tongue && <ellipse cx={CX} cy={CY + c.ry * 0.42} rx={c.rx * 0.6} ry={c.ry * 0.38} fill={TONGUE} />}
    </g>
  );
}

export function MouthChart({ shape }: { shape: MouthShape }): JSX.Element {
  return (
    <svg viewBox="0 0 160 152" className="mouthchart__svg" aria-hidden="true" focusable="false">
      {renderShape(shape)}
    </svg>
  );
}
