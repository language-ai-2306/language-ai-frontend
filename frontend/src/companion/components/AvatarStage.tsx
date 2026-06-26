/**
 * AvatarStage — renders the 3D character. The SVG mascot is used ONLY as a true
 * fallback: when WebGL is unavailable, or if the canvas errors at runtime. It is
 * NOT used as the loading placeholder — the loading state is handled by a single
 * Suspense boundary up in CompanionScreen, so the whole UI appears together once
 * the model is ready (no SVG-then-3D flash). The 3D canvas is lazy-loaded so
 * three.js stays out of the initial bundle; its suspension bubbles up to that
 * boundary.
 */
import { Component, lazy, useMemo, type ReactNode } from 'react';

import type { MouthShape } from '../lipsync/useLipSync';
import type { Emotion } from '../lipsync/visemes';
import type { AvatarState } from '../types';
import { isWebGLAvailable } from '../utils/webgl';
import { CompanionAvatar } from './CompanionAvatar';

/**
 * Import with a few retries — a transient chunk-load failure (flaky network, or
 * a stale dev HMR url) otherwise gets permanently cached by React.lazy and would
 * drop us to the SVG fallback until a full reload.
 */
function importWithRetry<T>(factory: () => Promise<T>, retries = 3, delay = 400): Promise<T> {
  return factory().catch((err) => {
    if (retries <= 0) throw err;
    return new Promise<T>((resolve) => setTimeout(resolve, delay)).then(() =>
      importWithRetry(factory, retries - 1, delay),
    );
  });
}

const Avatar3DCanvas = lazy(() => importWithRetry(() => import('../three/Avatar3DCanvas')));

export interface AvatarStageProps {
  state: AvatarState;
  /** Lip-sync amplitude while speaking (0..1) — used when no visemes exist. */
  mouthOpen: number;
  /** True while recording — enables the level-driven reactions. */
  micActive: boolean;
  /** Instantaneous input level accessor (0..1). */
  getLevel: () => number;
  /** Current Rhubarb viseme from lip-sync ('X' when not lip-syncing). */
  viseme?: MouthShape;
  /** Emotion to express while speaking (drives facial blendshapes). */
  emotion?: Emotion;
}

/** Falls back to the SVG mascot if the 3D canvas throws at runtime. */
class WebGLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function AvatarStage({
  state,
  mouthOpen,
  micActive,
  getLevel,
  viseme = 'X',
  emotion = 'neutral',
}: AvatarStageProps): JSX.Element {
  const webgl = useMemo(() => isWebGLAvailable(), []);
  const fallback = (
    <div className="avatar-stage__fallback">
      <CompanionAvatar state={state} mouthOpen={mouthOpen} />
    </div>
  );

  return (
    <div className="avatar-stage">
      {webgl ? (
        <WebGLBoundary fallback={fallback}>
          <Avatar3DCanvas
            state={state}
            mouthOpen={mouthOpen}
            micActive={micActive}
            getLevel={getLevel}
            viseme={viseme}
            emotion={emotion}
          />
        </WebGLBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
