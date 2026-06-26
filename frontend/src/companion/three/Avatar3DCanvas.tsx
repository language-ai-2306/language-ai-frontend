/**
 * Avatar3DCanvas — the React Three Fiber canvas hosting the 3D character.
 *
 * Default-exported so it can be lazy-loaded (keeps three.js out of the initial
 * bundle). Transparent canvas so the room background shows through; DPR capped
 * for mobile performance; soft three-point lighting, no shadow maps.
 */
import { Canvas } from '@react-three/fiber';

import type { MouthShape } from '../lipsync/useLipSync';
import type { Emotion } from '../lipsync/visemes';
import type { AvatarState } from '../types';
import { AnimalModel } from './AnimalModel';
import { AVATAR_KIND } from './avatarConfig';
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
}

// Camera framing differs per avatar: the fox is a full-body wide shot; the human
// avatar is framed as a head-and-shoulders bust. The bust camera sits at y=0
// looking straight ahead (the model shifts its face down to the origin), so the
// look-direction is unambiguous and we get an eye-level shot, not a top-down one.
const CAMERA =
  AVATAR_KIND === 'rpm'
    ? { position: [0, 0, 1.4] as [number, number, number], fov: 28 }
    : { position: [0, 0.55, 7.0] as [number, number, number], fov: 40 };

export default function Avatar3DCanvas(props: Avatar3DCanvasProps): JSX.Element {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={CAMERA}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <pointLight position={[-3, 1, 3]} intensity={0.4} />
      {AVATAR_KIND === 'rpm' ? <RpmModel {...props} /> : <AnimalModel {...props} />}
    </Canvas>
  );
}
