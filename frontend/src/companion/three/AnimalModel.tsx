/**
 * AnimalModel — loads the Quaternius Fox (CC0) and drives it from AvatarState.
 *
 * The model is rigged with idle/jump/etc. clips but has NO jaw bone or mouth
 * blendshapes, so "talking" is faked the standard way for viseme-less models:
 * while `speaking`, a snout/head chatter driven by the speech amplitude
 * (`mouthOpen`, which oscillates ~16fps from useSpeech) is layered on top of the
 * playing clip. While `listening` the whole model gently scales with mic level.
 *
 * The extra useFrame is registered AFTER useAnimations, so it runs after the
 * animation mixer each frame and can override the head bone's pose.
 */
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Group, Object3D } from 'three';

import type { AvatarState } from '../types';

const MODEL_URL = '/models/Fox.gltf';

// Transform to frame the fox facing the camera (tuned visually).
const BASE_SCALE = 0.95;
const POSITION: [number, number, number] = [0, -1.5, 0];
const ROTATION: [number, number, number] = [0, 0, 0];

// Map each app state to an animation clip in the model.
const CLIP: Record<AvatarState, string> = {
  idle: 'Idle',
  speaking: 'Idle',
  listening: 'Idle_2',
  thinking: 'Idle_2_HeadLow',
  celebrating: 'Jump_ToIdle',
  encouraging: 'Idle',
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface AnimalModelProps {
  state: AvatarState;
  mouthOpen: number;
  micActive: boolean;
  getLevel: () => number;
}

export function AnimalModel({ state, mouthOpen, micActive, getLevel }: AnimalModelProps): JSX.Element {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions } = useAnimations(animations, group);
  const head = useMemo(() => scene.getObjectByName('Head') as Object3D | null, [scene]);

  // Live inputs mirrored into refs so the frame loop reads fresh values.
  const stateRef = useRef(state);
  const mouthRef = useRef(mouthOpen);
  const micRef = useRef(micActive);
  const levelRef = useRef(getLevel);
  stateRef.current = state;
  mouthRef.current = mouthOpen;
  micRef.current = micActive;
  levelRef.current = getLevel;
  const level = useRef(0);

  // Crossfade to the clip for the current state.
  useEffect(() => {
    const action = actions[CLIP[state]] ?? actions.Idle;
    if (!action) return;
    action.reset().fadeIn(0.3).play();
    return () => {
      action.fadeOut(0.3);
    };
  }, [state, actions]);

  useFrame(() => {
    const s = stateRef.current;

    // Listening — scale gently with mic level.
    const target = micRef.current && s === 'listening' ? Math.min(1, levelRef.current()) : 0;
    level.current = lerp(level.current, target, 0.2);
    if (group.current) {
      group.current.scale.setScalar(BASE_SCALE * (1 + level.current * 0.06));
    }

    // Speaking — layer a snout/head chatter on top of the idle clip so it reads
    // as the fox mouthing the words (no jaw bone exists to open).
    if (head && s === 'speaking') {
      head.rotation.x += mouthRef.current * 0.45;
    }
  });

  return (
    <group ref={group} position={POSITION} rotation={ROTATION} scale={BASE_SCALE}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
