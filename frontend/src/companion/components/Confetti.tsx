/**
 * Confetti — purely decorative celebration scatter for the completion screens.
 *
 * Pieces are a fixed, hand-placed set (no randomness, so it renders identically
 * every time) and gently float in place. Hidden from assistive tech; the
 * global prefers-reduced-motion rule freezes the float to a static scatter.
 */
import './confetti.css';

interface Bit {
  left: string;
  top: string;
  color: string;
  size: number;
  rot: number;
  delay: number;
  round?: boolean;
}

const BITS: Bit[] = [
  { left: '10%', top: '8%', color: '#f472b6', size: 13, rot: 18, delay: 0 },
  { left: '24%', top: '14%', color: '#c4b5fd', size: 16, rot: -22, delay: 0.4 },
  { left: '52%', top: '6%', color: '#f9d048', size: 14, rot: 32, delay: 0.8 },
  { left: '72%', top: '12%', color: '#38bdf8', size: 11, rot: -14, delay: 0.2, round: true },
  { left: '86%', top: '9%', color: '#84cc16', size: 15, rot: 26, delay: 0.6 },
  { left: '15%', top: '22%', color: '#a855f7', size: 12, rot: -30, delay: 1, round: true },
  { left: '64%', top: '20%', color: '#f43f9d', size: 13, rot: 12, delay: 0.5 },
  { left: '90%', top: '24%', color: '#f472b6', size: 12, rot: -18, delay: 0.9, round: true },
  { left: '6%', top: '34%', color: '#f9d048', size: 11, rot: 40, delay: 0.3 },
  { left: '34%', top: '30%', color: '#38bdf8', size: 14, rot: -24, delay: 0.7 },
  { left: '80%', top: '36%', color: '#a855f7', size: 13, rot: 16, delay: 1.1 },
  { left: '46%', top: '40%', color: '#84cc16', size: 10, rot: -36, delay: 0.1, round: true },
  { left: '18%', top: '48%', color: '#f43f9d', size: 12, rot: 22, delay: 0.6 },
  { left: '70%', top: '52%', color: '#f9d048', size: 11, rot: -20, delay: 1.2 },
  { left: '88%', top: '60%', color: '#c4b5fd', size: 13, rot: 28, delay: 0.4, round: true },
  { left: '12%', top: '64%', color: '#38bdf8', size: 12, rot: -16, delay: 0.8 },
  { left: '40%', top: '72%', color: '#f472b6', size: 14, rot: 34, delay: 0.2 },
  { left: '76%', top: '78%', color: '#84cc16', size: 12, rot: -28, delay: 1 },
  { left: '22%', top: '84%', color: '#f9d048', size: 11, rot: 18, delay: 0.5, round: true },
  { left: '58%', top: '88%', color: '#a855f7', size: 13, rot: -22, delay: 0.9 },
];

export function Confetti(): JSX.Element {
  return (
    <div className="confetti" aria-hidden="true">
      {BITS.map((b, i) => (
        <span
          key={i}
          className={`confetti__bit${b.round ? ' confetti__bit--round' : ''}`}
          style={{
            left: b.left,
            top: b.top,
            width: b.size,
            height: b.size,
            background: b.color,
            transform: `rotate(${b.rot}deg)`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
