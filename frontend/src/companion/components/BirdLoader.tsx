/**
 * BirdLoader — a friendly "bird flying across the sky" indicator shown while the
 * 3D model + its three.js chunk load on first entry to an avatar screen.
 *
 * Pure CSS (no asset needed). To use a real animation instead, drop a gif in
 * public/ and swap the <span> emoji for <img src="/bird.gif" alt="" />.
 */
import './birdLoader.css';

export function BirdLoader({ label = 'Loading…' }: { label?: string }): JSX.Element {
  return (
    <div className="bird-loader" role="status" aria-live="polite">
      <div className="bird-loader__sky" aria-hidden="true">
        <span className="bird-loader__bird">🐦</span>
      </div>
      <p className="bird-loader__label">{label}</p>
    </div>
  );
}
