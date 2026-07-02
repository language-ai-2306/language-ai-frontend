/**
 * MascotModel — generic loader for a Tripo-style GLB mascot. Handles both:
 *   • rigged models with a baked clip + Head bone (e.g. the otter) — plays the
 *     clip and tilts the head like a jaw for lip-sync, and
 *   • static, unrigged single-mesh models (e.g. the chipmunk) — adds a procedural
 *     idle breathe + a squash-and-stretch "talking" wobble so it feels alive.
 *
 * The model is auto-fit on load: its bounding box is measured and it's scaled +
 * recentred to a target height, so swapping in another mascot only needs the URL
 * (and maybe a yaw tweak) — no hand-tuned scale/position per model.
 *
 * To try a different mascot: drop the .glb in public/models, set MODEL_URL below,
 * and adjust YAW_DEG if it isn't facing the camera. (HMR — no restart needed.)
 */
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Box3, Vector3, type Group, type Object3D } from 'three';

import type { MouthShape } from '../lipsync/useLipSync';
import {
  applyVisemeMorphs,
  buildMorphPlan,
  lerpPose,
  poseForViseme,
  REST_POSE,
  type Emotion,
  type VisemePose,
} from '../lipsync/visemes';
import type { AvatarState } from '../types';
import { AVATAR_KIND } from './avatarConfig';

// TEST(temporary): trying the HD ARKit Ollie. REVERT to the otter (uncomment the
// line below) + delete public/models/ollie_hd_arkit_lipsync_test.glb when done.
// const MODEL_URL = '/models/basicanimationottermodel.glb';
const MODEL_URL = '/models/ollie_hd_arkit_lipsync_test.glb';
/** Yaw (degrees) to turn the model toward the camera. */
const YAW_DEG = -90;
/** World height the model is scaled to fill (matches the camera framing). */
const TARGET_HEIGHT = 2.8;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface MascotModelProps {
  state: AvatarState;
  mouthOpen: number;
  micActive: boolean;
  getLevel: () => number;
  /** Current Rhubarb viseme from lip-sync ('X' when not lip-syncing). */
  viseme?: MouthShape;
  /** Accepted for prop parity with RpmModel; static mascots have no morphs. */
  emotion?: Emotion;
}

export function MascotModel({
  state,
  mouthOpen,
  micActive,
  getLevel,
  viseme = 'X',
}: MascotModelProps): JSX.Element {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions, names } = useAnimations(animations, group);
  const head = useMemo(() => scene.getObjectByName('Head') as Object3D | null, [scene]);
  // Real mouth blendshapes if present (null for unrigged Tripo mascots).
  const morphPlan = useMemo(() => buildMorphPlan(scene), [scene]);

  // Auto-fit: measure the model and scale + recentre it to TARGET_HEIGHT so any
  // mascot frames the same way without per-model tuning.
  const fit = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    const scale = TARGET_HEIGHT / (size.y || 1);
    return {
      scale,
      position: [-center.x * scale, -center.y * scale, -center.z * scale] as [
        number,
        number,
        number,
      ],
    };
  }, [scene]);
  const baseYaw = (YAW_DEG * Math.PI) / 180;

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
  const poseRef = useRef<VisemePose>(REST_POSE);

  // Loop the first baked clip (if the model has one) as the idle.
  useEffect(() => {
    const action = names.length ? actions[names[0]] : null;
    if (!action) return;
    action.reset().fadeIn(0.3).play();
    return () => {
      action.fadeOut(0.3);
    };
  }, [actions, names]);

  useFrame((st) => {
    const g = group.current;
    if (!g) return;
    const t = st.clock.elapsedTime;
    const s = stateRef.current;

    // Listening — grow gently with mic level.
    const micTarget = micRef.current && s === 'listening' ? Math.min(1, levelRef.current()) : 0;
    level.current = lerp(level.current, micTarget, 0.2);

    // Smoothed mouth pose: aim at the current viseme while speaking, else relax.
    const speaking = s === 'speaking';
    const vis = visemeRef.current;
    const goal: VisemePose = !speaking
      ? REST_POSE
      : vis !== 'X'
        ? poseForViseme(vis)
        : { open: Math.min(1, mouthRef.current), round: 0, wide: 0, press: 0 };
    poseRef.current = lerpPose(poseRef.current, goal, 0.35);
    const pose = poseRef.current;

    // Subtle always-on breathing + the mic pulse.
    const breath = Math.sin(t * 1.6) * 0.012;
    const pulse = fit.scale * (1 + level.current * 0.06 + breath);

    if (morphPlan) {
      // Rigged with mouth blendshapes — drive them directly.
      g.scale.setScalar(pulse);
      applyVisemeMorphs(morphPlan, speaking ? vis : 'X', pose, 0.4);
    } else if (head) {
      // Has a head bone but no jaw — tilt the head like a jaw.
      g.scale.setScalar(pulse);
      if (speaking) {
        head.rotation.x += pose.open * 0.5;
        head.rotation.z += (pose.wide - pose.round) * 0.05;
      }
    } else {
      // Static mesh — squash & stretch the whole body to "talk".
      const sy = 1 - pose.open * 0.06;
      const sxz = 1 + pose.open * 0.04;
      g.scale.set(pulse * sxz, pulse * sy, pulse * sxz);
    }

    // Gentle idle sway so it never looks frozen.
    g.rotation.y = baseYaw + Math.sin(t * 0.6) * 0.04;
  });

  return (
    <group ref={group} position={fit.position} rotation={[0, baseYaw, 0]} scale={fit.scale}>
      <primitive object={scene} />
    </group>
  );
}

// Preload only when the mascot is the selected avatar.
if (AVATAR_KIND === 'mascot') useGLTF.preload(MODEL_URL);
