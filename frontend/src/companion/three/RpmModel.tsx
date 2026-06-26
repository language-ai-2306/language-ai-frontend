/**
 * RpmModel — renders a Ready Player Me avatar (GLB) and lip-syncs it.
 *
 * RPM avatars ship as a mesh + standard humanoid skeleton with mouth/eye
 * blendshapes (when requested via ?morphTargets=…) but NO animation clips, so
 * the idle here is procedural: gentle breathing, a head micro-sway, natural eye
 * blinks, and a subtle arm/wrist/finger sway (see collectIdleBones) so the hands
 * aren't frozen. The mouth is driven by the shared viseme driver — buildMorphPlan
 * finds the Wolf3D_Head / Wolf3D_Teeth viseme morphs automatically, so the
 * lip-sync "just works" with no per-model wiring.
 *
 * Framing knobs (SCALE / POSITION / ROTATION) are tuned for a head-and-shoulders
 * bust; the camera is set per-avatar in Avatar3DCanvas. Adjust if your avatar
 * sits high/low or faces away.
 */
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group, Object3D } from 'three';

import type { MouthShape } from '../lipsync/useLipSync';
import {
  applyVisemeMorphs,
  buildMorphPlan,
  EMOTION_DRIVEN,
  expressionWeights,
  lerpPose,
  LIPSYNC_ARKIT,
  poseForViseme,
  REST_POSE,
  type Emotion,
  type VisemePose,
} from '../lipsync/visemes';
import type { AvatarState } from '../types';
import { RPM_AVATAR_URL } from './avatarConfig';

// Bust framing. Tune in-browser if needed.
// Pun-Chan VRM is ~3.65 units tall and (VRM 0.x convention) faces -Z / away from
// the camera, so we scale it to ~1.6 units and spin it 180° to face us. After
// scaling, the face sits at y≈1.4, so we shift the whole model DOWN by ~1.4 to
// bring the face to the origin — where the eye-level camera (y=0) is aimed.
// For a real Ready-Player-Me avatar (~1.6 units, facing +Z) use SCALE 1,
// POSITION [0,0,0], ROTATION y 0.
const SCALE = 0.44;
const POSITION: [number, number, number] = [0, -1.4, 0];
const ROTATION: [number, number, number] = [0, Math.PI, 0]; // y: Math.PI = face camera

interface MorphCapable extends Object3D {
  morphTargetDictionary?: Record<string, number>;
  morphTargetInfluences?: number[];
}

interface BlinkTarget {
  influences: number[];
  l: number;
  r: number;
}

/** Locate the eye-blink morphs (ARKit eyeBlinkLeft/Right, or RPM eyesClosed). */
function findBlink(scene: Object3D): BlinkTarget | null {
  let found: BlinkTarget | null = null;
  scene.traverse((obj) => {
    const m = obj as MorphCapable;
    if (found || !m.morphTargetDictionary || !m.morphTargetInfluences) return;
    const keys = new Map<string, number>();
    for (const [k, v] of Object.entries(m.morphTargetDictionary)) keys.set(k.toLowerCase(), v);
    const l = keys.get('eyeblinkleft') ?? keys.get('eyesclosed');
    if (l === undefined) return;
    found = { influences: m.morphTargetInfluences, l, r: keys.get('eyeblinkright') ?? -1 };
  });
  return found;
}

interface IdleBone {
  obj: Object3D;
  /** Rest rotation (captured once) we oscillate around. */
  base: [number, number, number];
  /** Per-axis amplitude in radians. */
  amp: [number, number, number];
  freq: number;
  phase: number;
}

/**
 * Collect arm / wrist / finger bones so the hands aren't frozen. Each gets a
 * tiny sine sway around its REST rotation (stashed on userData so remounts reuse
 * the true rest, never an already-swayed pose). Names match the Pun-Chan VRM rig
 * ("Left arm", "Right elbow", "Index_001_L", …); missing bones are skipped, so
 * this is a no-op on rigs that don't have them.
 */
function collectIdleBones(scene: Object3D): IdleBone[] {
  const out: IdleBone[] = [];
  const add = (
    name: string,
    amp: [number, number, number],
    freq: number,
    phase: number,
  ): void => {
    const obj = scene.getObjectByName(name);
    if (!obj) return;
    if (!obj.userData.idleBase) {
      obj.userData.idleBase = [obj.rotation.x, obj.rotation.y, obj.rotation.z];
    }
    out.push({ obj, base: obj.userData.idleBase as [number, number, number], amp, freq, phase });
  };

  // Upper arms — the main gentle sway; left/right kept in opposite phase.
  add('Left arm', [0.05, 0, 0.035], 0.5, 0);
  add('Right arm', [0.05, 0, 0.035], 0.5, Math.PI);
  // Forearms — follow a touch slower/smaller.
  add('Left elbow', [0.04, 0, 0.025], 0.65, 0.8);
  add('Right elbow', [0.04, 0, 0.025], 0.65, 0.8 + Math.PI);
  // Wrists — small hand articulation.
  add('Left wrist', [0.05, 0.04, 0], 0.85, 0.4);
  add('Right wrist', [0.05, 0.04, 0], 0.85, 0.4 + Math.PI);
  // Fingers — soft "breathing" curl, staggered per finger so they don't move
  // in lockstep (3 segments each: Index_L, Index_001_L, Index_002_L).
  const fingers = ['Index', 'Middle', 'Ring', 'Pinkie', 'Thumb'];
  (['L', 'R'] as const).forEach((side, si) => {
    fingers.forEach((f, fi) => {
      for (const seg of ['', '_001', '_002']) {
        add(`${f}${seg}_${side}`, [0.03, 0, 0], 1.05, fi * 0.5 + si * Math.PI);
      }
    });
  });

  return out;
}

interface ExprMesh {
  influences: number[];
  /** Lowercased ARKit name → morph index, for the emotion shapes present. */
  index: Map<string, number>;
}

/** Resolve the emotion/expression blendshapes present on each morph mesh. */
function buildExpressionMeshes(scene: Object3D): ExprMesh[] {
  const out: ExprMesh[] = [];
  scene.traverse((obj) => {
    const m = obj as MorphCapable;
    if (!m.morphTargetDictionary || !m.morphTargetInfluences) return;
    const lower = new Map<string, number>();
    for (const [k, v] of Object.entries(m.morphTargetDictionary)) lower.set(k.toLowerCase(), v);
    const index = new Map<string, number>();
    for (const name of EMOTION_DRIVEN) {
      const idx = lower.get(name);
      if (idx !== undefined) index.set(name, idx);
    }
    if (index.size) out.push({ influences: m.morphTargetInfluences, index });
  });
  return out;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface RpmModelProps {
  state: AvatarState;
  mouthOpen: number;
  micActive: boolean;
  getLevel: () => number;
  viseme?: MouthShape;
  emotion?: Emotion;
}

export function RpmModel({
  state,
  mouthOpen,
  micActive,
  getLevel,
  viseme = 'X',
  emotion = 'neutral',
}: RpmModelProps): JSX.Element {
  const group = useRef<Group>(null);
  const { scene } = useGLTF(RPM_AVATAR_URL);

  const morphPlan = useMemo(() => buildMorphPlan(scene), [scene]);
  const blink = useMemo(() => findBlink(scene), [scene]);
  const spine = useMemo(
    () =>
      scene.getObjectByName('Spine2') ??
      scene.getObjectByName('Spine1') ??
      scene.getObjectByName('Chest') ?? // Pun-Chan VRM rig uses Chest/Spine
      scene.getObjectByName('Spine') ??
      null,
    [scene],
  );
  const head = useMemo(() => scene.getObjectByName('Head') ?? null, [scene]);
  const idleBones = useMemo(() => collectIdleBones(scene), [scene]);
  const exprMeshes = useMemo(() => buildExpressionMeshes(scene), [scene]);

  // Live inputs mirrored into refs for the frame loop.
  const stateRef = useRef(state);
  const mouthRef = useRef(mouthOpen);
  const micRef = useRef(micActive);
  const levelRef = useRef(getLevel);
  const visemeRef = useRef(viseme);
  const emotionRef = useRef(emotion);
  stateRef.current = state;
  mouthRef.current = mouthOpen;
  micRef.current = micActive;
  levelRef.current = getLevel;
  visemeRef.current = viseme;
  emotionRef.current = emotion;

  const poseRef = useRef<VisemePose>(REST_POSE);
  const breath = useRef(0);
  const nextBlinkAt = useRef(2);
  const emoAmt = useRef(0); // emotion ramp (0 idle → 1 while speaking)

  useFrame((st) => {
    const t = st.clock.elapsedTime;
    const s = stateRef.current;

    // Procedural idle — breathing + tiny head sway so it's never a frozen statue.
    if (spine) spine.rotation.x = Math.sin(t * 1.4) * 0.022;
    if (head) head.rotation.z = Math.sin(t * 0.7) * 0.02;

    // Listening — lean in slightly with mic level.
    const lvl = micRef.current && s === 'listening' ? Math.min(1, levelRef.current()) : 0;
    breath.current = lerp(breath.current, lvl, 0.2);
    if (group.current) group.current.scale.setScalar(SCALE * (1 + breath.current * 0.04));

    // Idle arm/hand sway so the hands aren't a frozen statue. Each bone
    // oscillates around its rest rotation; amplitude lifts a little while the
    // user is speaking/listening so it feels more engaged.
    const liveliness = (s === 'speaking' ? 1 : 0.7) + breath.current * 0.4;
    for (const b of idleBones) {
      const o = Math.sin(t * b.freq + b.phase) * liveliness;
      b.obj.rotation.set(
        b.base[0] + b.amp[0] * o,
        b.base[1] + b.amp[1] * o,
        b.base[2] + b.amp[2] * o,
      );
    }

    // Natural blinks (~every 2–5s, quick close+open).
    if (blink) {
      let amt = 0;
      const since = t - nextBlinkAt.current;
      if (since >= 0) {
        if (since < 0.14) amt = Math.sin((since / 0.14) * Math.PI);
        else nextBlinkAt.current = t + 2 + Math.random() * 3;
      }
      blink.influences[blink.l] = amt;
      if (blink.r >= 0) blink.influences[blink.r] = amt;
    }

    // Lip-sync — viseme pose while speaking, relax to rest otherwise.
    const speaking = s === 'speaking';
    const vis = visemeRef.current;
    const goal: VisemePose = !speaking
      ? REST_POSE
      : vis !== 'X'
        ? poseForViseme(vis)
        : { open: Math.min(1, mouthRef.current), round: 0, wide: 0, press: 0 };
    poseRef.current = lerpPose(poseRef.current, goal, 0.35);
    if (morphPlan) applyVisemeMorphs(morphPlan, speaking ? vis : 'X', poseRef.current, 0.4);

    // Emotional expression — layered OVER lip-sync (so it runs last). Ramps in
    // while speaking and relaxes to neutral otherwise.
    emoAmt.current = lerp(emoAmt.current, speaking ? 1 : 0, 0.06);
    if (emoAmt.current > 0.001 || emotionRef.current !== 'neutral') {
      const weights = expressionWeights(emotionRef.current);
      for (const em of exprMeshes) {
        for (const [name, idx] of em.index) {
          const target = (weights.get(name) ?? 0) * emoAmt.current;
          em.influences[idx] = LIPSYNC_ARKIT.has(name)
            ? Math.min(1, (em.influences[idx] ?? 0) + target) // add on top of the mouth motion
            : target; // brows/cheeks/etc. — lip-sync doesn't touch these
        }
      }
    }
  });

  return (
    <group ref={group} position={POSITION} rotation={ROTATION} scale={SCALE}>
      <primitive object={scene} />
    </group>
  );
}
