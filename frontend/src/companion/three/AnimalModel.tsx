/**
 * AnimalModel — loads the Quaternius Fox (CC0) and drives it from AvatarState.
 *
 * Lip-sync: when the model exposes mouth morph targets (Oculus visemes or
 * ARKit/jawOpen blendshapes) we drive them directly from the current Rhubarb
 * viseme — true per-sound mouth shapes. The current Fox has NO jaw bone or
 * blendshapes, so it falls back to a per-viseme head motion: the `open` channel
 * of the viseme pose tilts the head like a jaw, so "ah" opens wide and "oo"
 * barely moves — i.e. the motion tracks the *sounds*, not just the volume.
 *
 * The extra useFrame is registered AFTER useAnimations, so it runs after the
 * animation mixer each frame and can override the head bone's pose / morphs.
 */
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Group, Object3D } from 'three';

import type { MouthShape } from '../lipsync/useLipSync';
import {
  applyVisemeMorphs,
  buildMorphPlan,
  lerpPose,
  poseForViseme,
  REST_POSE,
  type VisemePose,
} from '../lipsync/visemes';
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
  /** Current Rhubarb viseme from lip-sync ('X' when not lip-syncing). */
  viseme?: MouthShape;
}

export function AnimalModel({
  state,
  mouthOpen,
  micActive,
  getLevel,
  viseme = 'X',
}: AnimalModelProps): JSX.Element {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions } = useAnimations(animations, group);
  const head = useMemo(() => scene.getObjectByName('Head') as Object3D | null, [scene]);
  // Wire up mouth morph targets if the model has them (null for the Fox).
  const morphPlan = useMemo(() => buildMorphPlan(scene), [scene]);

  // Live inputs mirrored into refs so the frame loop reads fresh values.
  const stateRef = useRef(state);
  const mouthRef = useRef(mouthOpen);
  const micRef = useRef(micActive);
  const levelRef = useRef(getLevel);
  const visemeRef = useRef(viseme);
  stateRef.current = state;
  mouthRef.current = mouthOpen;
  micRef.current = micActive;
  levelRef.current = getLevel;
  visemeRef.current = viseme;
  const level = useRef(0);
  // Smoothed mouth pose so transitions between sounds aren't jumpy.
  const poseRef = useRef<VisemePose>(REST_POSE);

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

    // Lip-sync. Aim for the current viseme's pose while speaking; otherwise
    // relax the mouth shut. When there are no viseme cues (e.g. browser TTS),
    // fall back to the raw amplitude as a plain open/close.
    const speaking = s === 'speaking';
    const vis = visemeRef.current;
    let goal: VisemePose;
    if (!speaking) {
      goal = REST_POSE;
    } else if (vis !== 'X') {
      goal = poseForViseme(vis);
    } else {
      goal = { open: Math.min(1, mouthRef.current), round: 0, wide: 0, press: 0 };
    }
    poseRef.current = lerpPose(poseRef.current, goal, 0.35);
    const pose = poseRef.current;

    if (morphPlan) {
      // Real mouth shapes via blendshapes (rigged avatars).
      applyVisemeMorphs(morphPlan, speaking ? vis : 'X', pose, 0.4);
    } else if (head && speaking) {
      // Fox has no jaw — approximate by tilting the head like a jaw, plus a
      // tiny round/wide sway so different sounds read differently.
      head.rotation.x += pose.open * 0.5;
      head.rotation.z += (pose.wide - pose.round) * 0.05;
    }
  });

  return (
    <group ref={group} position={POSITION} rotation={ROTATION} scale={BASE_SCALE}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
