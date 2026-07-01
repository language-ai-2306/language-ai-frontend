/**
 * Avatar3DCanvas — the React Three Fiber canvas hosting the 3D character.
 *
 * Default-exported so it can be lazy-loaded (keeps three.js out of the initial
 * bundle). Transparent canvas so the room background shows through; DPR capped
 * for mobile performance; soft three-point lighting, no shadow maps.
 */
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useRef } from 'react';

import type { MouthShape } from '../lipsync/useLipSync';
import type { Emotion } from '../lipsync/visemes';
import type { AvatarState } from '../types';
import { AnimalModel } from './AnimalModel';
import { AVATAR_KIND, CAMERA, type CameraPreset } from './avatarConfig';
import { MascotModel } from './MascotModel';
import { RpmModel } from './RpmModel';

export interface Avatar3DCanvasProps {
  state: AvatarState;
  mouthOpen: number;
  micActive: boolean;
  getLevel: () => number;
  /** Current Rhubarb viseme from lip-sync ('X' when not lip-syncing). */
  viseme?: MouthShape;
  /** Emotion to express while speaking. */
  emotion?: Emotion;
  /** Fixed camera framing; falls back to the per-avatar-kind CAMERA default. */
  camera?: CameraPreset;
}

// DEV: drag to orbit, scroll to zoom, right-drag to pan — for finding a camera
// framing. The chosen values are logged so they can be baked into CAMERA above.
// Set to false (or remove <OrbitControls/>) before shipping — kids shouldn't be
// able to spin the avatar.
const CAMERA_DEBUG = false;

/** Minimal shape of the OrbitControls instance we read for logging. */
interface OrbitLike {
  object: { position: { toArray(): number[] } };
  target: { toArray(): number[] };
}

export default function Avatar3DCanvas({
  camera,
  ...modelProps
}: Avatar3DCanvasProps): JSX.Element {
  const controls = useRef<OrbitLike | null>(null);
  const logCamera = (): void => {
    const c = controls.current;
    if (!c) return;
    const r = (a: number[]): number[] => a.map((n) => +n.toFixed(2));
    // eslint-disable-next-line no-console
    console.log('[camera] position', r(c.object.position.toArray()), 'lookAt', r(c.target.toArray()));
  };
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={camera ?? CAMERA}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <pointLight position={[-3, 1, 3]} intensity={0.4} />
      {AVATAR_KIND === 'rpm' ? (
        <RpmModel {...modelProps} />
      ) : AVATAR_KIND === 'mascot' ? (
        <MascotModel {...modelProps} />
      ) : (
        <AnimalModel {...modelProps} />
      )}
      {CAMERA_DEBUG && (
        <OrbitControls ref={controls as never} makeDefault onEnd={logCamera} />
      )}
    </Canvas>
  );
}
