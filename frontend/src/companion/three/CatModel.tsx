/**
 * CatModel — an original low-poly 3D character ("Pip the cat") built from
 * Three.js primitives via React Three Fiber. Original artwork: a friendly
 * blue-grey kitten, deliberately NOT modelled on any commercial character.
 *
 * Animation is driven in useFrame from refs (never React state) so it stays at
 * 60fps without re-rendering the scene. The character reacts per AvatarState and
 * gently responds to live mic level while listening; the mouth opens with
 * `mouthOpen` while speaking. Honors prefers-reduced-motion.
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';

import type { AvatarState } from '../types';

export interface CatModelProps {
  state: AvatarState;
  mouthOpen: number;
  micActive: boolean;
  getLevel: () => number;
}

// Palette — soft, original, on-brand.
const FUR = '#8f9cb8';
const FUR_LIGHT = '#e9edf5';
const EAR_INNER = '#ffb9c6';
const NOSE = '#ff9fb0';
const IRIS = '#56c7b2';
const DARK = '#2c3e54';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function CatModel({ state, mouthOpen, micActive, getLevel }: CatModelProps): JSX.Element {
  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const mouth = useRef<Mesh>(null);
  const earL = useRef<Group>(null);
  const earR = useRef<Group>(null);
  const tail = useRef<Group>(null);

  // Live inputs mirrored into refs so useFrame never depends on React state.
  const stateRef = useRef(state);
  const mouthRef = useRef(mouthOpen);
  const micRef = useRef(micActive);
  const levelRef = useRef(getLevel);
  stateRef.current = state;
  mouthRef.current = mouthOpen;
  micRef.current = micActive;
  levelRef.current = getLevel;

  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
    [],
  );
  const level = useRef(0);

  useFrame((frame) => {
    const t = frame.clock.getElapsedTime();
    const s = stateRef.current;
    if (!root.current || !head.current) return;

    // Smooth the mic level for soft, non-jittery reactions.
    const target = micRef.current && s === 'listening' ? Math.min(1, levelRef.current()) : 0;
    level.current = lerp(level.current, target, 0.2);

    const bob = reduced ? 0 : Math.sin(t * 1.6) * 0.04;
    let posY = bob;
    let rotZ = 0;
    let scale = 1;
    let headX = 0;
    let headZ = 0;
    let earPerk = 0;

    switch (s) {
      case 'celebrating': {
        const b = reduced ? 0 : Math.abs(Math.sin(t * 4)) * 0.22;
        posY = b;
        rotZ = reduced ? 0 : Math.sin(t * 8) * 0.04;
        scale = 1.03;
        earPerk = 0.18;
        break;
      }
      case 'listening': {
        scale = 1 + level.current * 0.07;
        headZ = reduced ? 0.05 : 0.05 + Math.sin(t * 1.2) * 0.03;
        earPerk = 0.22 + level.current * 0.15;
        break;
      }
      case 'thinking': {
        headX = -0.18;
        headZ = 0.12;
        earPerk = -0.1;
        break;
      }
      case 'encouraging': {
        rotZ = reduced ? 0 : Math.sin(t * 1.6) * 0.06;
        headZ = reduced ? 0 : Math.sin(t * 1.6) * 0.04;
        break;
      }
      case 'speaking': {
        posY = reduced ? 0 : Math.sin(t * 5) * 0.03;
        break;
      }
      default:
        break; // idle
    }

    root.current.position.y = lerp(root.current.position.y, posY, 0.2);
    root.current.rotation.z = lerp(root.current.rotation.z, rotZ, 0.15);
    const sc = lerp(root.current.scale.x, scale, 0.15);
    root.current.scale.setScalar(sc);

    head.current.rotation.x = lerp(head.current.rotation.x, headX, 0.15);
    head.current.rotation.z = lerp(head.current.rotation.z, headZ, 0.15);

    if (earL.current && earR.current) {
      earL.current.rotation.z = lerp(earL.current.rotation.z, 0.2 - earPerk, 0.2);
      earR.current.rotation.z = lerp(earR.current.rotation.z, -0.2 + earPerk, 0.2);
    }

    if (mouth.current) {
      const open = s === 'speaking' ? 0.15 + mouthRef.current * 0.9 : 0.12;
      mouth.current.scale.y = lerp(mouth.current.scale.y, open, 0.4);
    }

    if (tail.current && !reduced) {
      tail.current.rotation.z = Math.sin(t * 2) * 0.18;
    }
  });

  return (
    <group ref={root} position={[0, 0, 0]}>
      {/* Body */}
      <mesh position={[0, -0.7, 0]} scale={[1, 1.12, 0.95]}>
        <sphereGeometry args={[1.02, 32, 32]} />
        <meshStandardMaterial color={FUR} roughness={0.7} />
      </mesh>
      {/* Belly */}
      <mesh position={[0, -0.72, 0.45]} scale={[0.92, 1.05, 0.6]}>
        <sphereGeometry args={[0.6, 24, 24]} />
        <meshStandardMaterial color={FUR_LIGHT} roughness={0.8} />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.82, -0.6, 0.3]}>
        <sphereGeometry args={[0.24, 20, 20]} />
        <meshStandardMaterial color={FUR} roughness={0.7} />
      </mesh>
      <mesh position={[0.82, -0.6, 0.3]}>
        <sphereGeometry args={[0.24, 20, 20]} />
        <meshStandardMaterial color={FUR} roughness={0.7} />
      </mesh>
      {/* Feet */}
      <mesh position={[-0.42, -1.55, 0.5]} scale={[1, 0.7, 1.25]}>
        <sphereGeometry args={[0.3, 20, 20]} />
        <meshStandardMaterial color={FUR_LIGHT} roughness={0.8} />
      </mesh>
      <mesh position={[0.42, -1.55, 0.5]} scale={[1, 0.7, 1.25]}>
        <sphereGeometry args={[0.3, 20, 20]} />
        <meshStandardMaterial color={FUR_LIGHT} roughness={0.8} />
      </mesh>
      {/* Tail */}
      <group ref={tail} position={[0.95, -1.25, -0.3]}>
        <mesh position={[0.1, 0.2, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color={FUR} roughness={0.7} />
        </mesh>
        <mesh position={[0.32, 0.55, -0.05]}>
          <sphereGeometry args={[0.17, 16, 16]} />
          <meshStandardMaterial color={FUR} roughness={0.7} />
        </mesh>
        <mesh position={[0.48, 0.92, -0.1]}>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshStandardMaterial color={FUR_LIGHT} roughness={0.8} />
        </mesh>
      </group>

      {/* Head group */}
      <group ref={head} position={[0, 0.75, 0]}>
        <mesh>
          <sphereGeometry args={[0.95, 32, 32]} />
          <meshStandardMaterial color={FUR} roughness={0.7} />
        </mesh>

        {/* Ears */}
        <group ref={earL} position={[-0.5, 0.78, 0]}>
          <mesh rotation={[0, 0, 0]}>
            <coneGeometry args={[0.3, 0.55, 24]} />
            <meshStandardMaterial color={FUR} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.02, 0.08]} scale={[0.6, 0.7, 0.6]}>
            <coneGeometry args={[0.3, 0.55, 24]} />
            <meshStandardMaterial color={EAR_INNER} roughness={0.8} />
          </mesh>
        </group>
        <group ref={earR} position={[0.5, 0.78, 0]}>
          <mesh>
            <coneGeometry args={[0.3, 0.55, 24]} />
            <meshStandardMaterial color={FUR} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.02, 0.08]} scale={[0.6, 0.7, 0.6]}>
            <coneGeometry args={[0.3, 0.55, 24]} />
            <meshStandardMaterial color={EAR_INNER} roughness={0.8} />
          </mesh>
        </group>

        {/* Muzzle */}
        <mesh position={[0, -0.28, 0.66]} scale={[1, 0.82, 0.7]}>
          <sphereGeometry args={[0.42, 24, 24]} />
          <meshStandardMaterial color={FUR_LIGHT} roughness={0.85} />
        </mesh>
        {/* Nose */}
        <mesh position={[0, -0.16, 0.99]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color={NOSE} roughness={0.6} />
        </mesh>
        {/* Mouth (opens while speaking) */}
        <mesh ref={mouth} position={[0, -0.42, 0.92]} scale={[1, 0.12, 1]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={DARK} roughness={0.5} />
        </mesh>

        {/* Eyes */}
        {[-0.34, 0.34].map((x) => (
          <group key={x} position={[x, 0.12, 0.7]}>
            <mesh>
              <sphereGeometry args={[0.22, 24, 24]} />
              <meshStandardMaterial color="#ffffff" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, 0.13]}>
              <sphereGeometry args={[0.12, 20, 20]} />
              <meshStandardMaterial color={IRIS} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, 0.2]}>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshStandardMaterial color={DARK} />
            </mesh>
            <mesh position={[-0.04, 0.05, 0.24]}>
              <sphereGeometry args={[0.025, 12, 12]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} />
            </mesh>
          </group>
        ))}

        {/* Cheeks */}
        <mesh position={[-0.55, -0.22, 0.55]} scale={[1, 1, 0.3]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color={EAR_INNER} transparent opacity={0.55} roughness={0.9} />
        </mesh>
        <mesh position={[0.55, -0.22, 0.55]} scale={[1, 1, 0.3]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color={EAR_INNER} transparent opacity={0.55} roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}
