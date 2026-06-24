/**
 * Avatar3DCanvas — the React Three Fiber canvas hosting the 3D character.
 *
 * Default-exported so it can be lazy-loaded (keeps three.js out of the initial
 * bundle). Transparent canvas so the room background shows through; DPR capped
 * for mobile performance; soft three-point lighting, no shadow maps.
 */
import { Canvas } from '@react-three/fiber';

import type { AvatarState } from '../types';
import { AnimalModel } from './AnimalModel';

export interface Avatar3DCanvasProps {
  state: AvatarState;
  mouthOpen: number;
  micActive: boolean;
  getLevel: () => number;
}

export default function Avatar3DCanvas(props: Avatar3DCanvasProps): JSX.Element {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.55, 7.0], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <pointLight position={[-3, 1, 3]} intensity={0.4} />
      <AnimalModel {...props} />
    </Canvas>
  );
}
