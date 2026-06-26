/**
 * visemes — turns a Rhubarb mouth shape (A–H, X) into something a 3D head can
 * act out, so the avatar's mouth matches the *sounds* of the word (not just its
 * volume) for clear pronunciation.
 *
 * Two layers:
 *  1. VISEME_POSE — a model-agnostic pose per viseme (jaw open / lip round / lip
 *     width / press). Drives the fallback head motion and the ARKit-style
 *     "channel" blendshapes.
 *  2. buildMorphPlan — inspects a loaded glTF for mouth morph targets and wires
 *     visemes to them. Supports two common rigs out of the box:
 *       • Oculus/Ready-Player-Me visemes  (viseme_aa, viseme_PP, …)
 *       • ARKit / generic blendshapes      (jawOpen, mouthFunnel, mouthPucker…)
 *     Returns null when the model has no mouth morphs (e.g. the current Fox),
 *     so the caller uses the bone-based fallback instead.
 */
import type { Object3D } from 'three';

import type { MouthShape } from './useLipSync';

export interface VisemePose {
  /** Jaw / mouth openness (0 closed → 1 wide). */
  open: number;
  /** Lip rounding & pucker (oo / oh). */
  round: number;
  /** Lip spread / smile width (ee). */
  wide: number;
  /** Lips pressed shut (p / b / m). */
  press: number;
}

/** Mouth pose per Rhubarb viseme (see specs/PHONEMES_AND_LIPSYNC.md). */
export const VISEME_POSE: Record<MouthShape, VisemePose> = {
  X: { open: 0.0, round: 0.0, wide: 0.0, press: 0.0 }, // rest / silence
  A: { open: 0.0, round: 0.0, wide: 0.1, press: 1.0 }, // p, b, m
  B: { open: 0.18, round: 0.0, wide: 0.5, press: 0.0 }, // many consonants, ee
  C: { open: 0.42, round: 0.1, wide: 0.4, press: 0.0 }, // eh, ae
  D: { open: 0.95, round: 0.0, wide: 0.2, press: 0.0 }, // ah (wide open)
  E: { open: 0.5, round: 0.6, wide: 0.0, press: 0.0 }, // aw, oh
  F: { open: 0.16, round: 1.0, wide: 0.0, press: 0.0 }, // oo, w (pucker)
  G: { open: 0.16, round: 0.0, wide: 0.5, press: 0.0 }, // f, v
  H: { open: 0.5, round: 0.1, wide: 0.2, press: 0.0 }, // l (tongue)
};

export const REST_POSE: VisemePose = VISEME_POSE.X;

export function poseForViseme(v: MouthShape): VisemePose {
  return VISEME_POSE[v] ?? REST_POSE;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function lerpPose(a: VisemePose, b: VisemePose, t: number): VisemePose {
  return {
    open: lerp(a.open, b.open, t),
    round: lerp(a.round, b.round, t),
    wide: lerp(a.wide, b.wide, t),
    press: lerp(a.press, b.press, t),
  };
}

// --- Morph-target wiring ----------------------------------------------------

/** Oculus / Ready-Player-Me viseme morph names per Rhubarb shape (best match). */
const OCULUS_VISEME: Record<MouthShape, string[]> = {
  X: ['viseme_sil'],
  A: ['viseme_PP'],
  B: ['viseme_I', 'viseme_SS', 'viseme_DD'],
  C: ['viseme_E'],
  D: ['viseme_aa', 'viseme_AA'],
  E: ['viseme_O'],
  F: ['viseme_U'],
  G: ['viseme_FF'],
  H: ['viseme_nn', 'viseme_RR'],
};

type Channel = 'open' | 'funnel' | 'pucker' | 'close' | 'wide';

/** ARKit / generic blendshape names per pose channel. */
const CHANNEL_ALIASES: Record<Channel, string[]> = {
  open: ['jawopen', 'mouthopen', 'jaw_open', 'mouth_open', 'aa'],
  funnel: ['mouthfunnel', 'mouth_funnel'],
  pucker: ['mouthpucker', 'mouth_pucker', 'mouthupperupmiddle'],
  close: ['mouthclose', 'mouth_close'],
  wide: [
    'mouthsmileleft',
    'mouthsmileright',
    'mouthsmile_l',
    'mouthsmile_r',
    'mouthsmile',
    'mouthstretchleft',
    'mouthstretchright',
  ],
};

interface MorphMesh {
  influences: number[];
  /** Direct viseme → morph index (Oculus rigs). */
  visemeIndex: Partial<Record<MouthShape, number>>;
  /** Pose channel → morph indices (ARKit / generic rigs). */
  channelIndex: Partial<Record<Channel, number[]>>;
  hasVisemes: boolean;
  /** Every index we manage, so unused morphs relax to 0. */
  managed: number[];
}

export interface MorphPlan {
  meshes: MorphMesh[];
}

interface MorphCapable extends Object3D {
  morphTargetDictionary?: Record<string, number>;
  morphTargetInfluences?: number[];
}

/** Find a dictionary key matching any alias (case-insensitive). */
function findIndex(lowerKeys: Map<string, number>, aliases: string[]): number | undefined {
  for (const a of aliases) {
    const idx = lowerKeys.get(a.toLowerCase());
    if (idx !== undefined) return idx;
  }
  return undefined;
}

function findAll(lowerKeys: Map<string, number>, aliases: string[]): number[] {
  const out: number[] = [];
  for (const a of aliases) {
    const idx = lowerKeys.get(a.toLowerCase());
    if (idx !== undefined && !out.includes(idx)) out.push(idx);
  }
  return out;
}

/**
 * Inspect a scene for mouth morph targets and build a driving plan, or return
 * null if the model has none (caller falls back to bone motion).
 */
export function buildMorphPlan(scene: Object3D): MorphPlan | null {
  const meshes: MorphMesh[] = [];

  scene.traverse((obj) => {
    const m = obj as MorphCapable;
    if (!m.morphTargetDictionary || !m.morphTargetInfluences) return;

    const lowerKeys = new Map<string, number>();
    for (const [name, idx] of Object.entries(m.morphTargetDictionary)) {
      lowerKeys.set(name.toLowerCase(), idx);
    }

    // 1) Oculus / RPM visemes — map each Rhubarb shape to its morph.
    const visemeIndex: Partial<Record<MouthShape, number>> = {};
    (Object.keys(OCULUS_VISEME) as MouthShape[]).forEach((vs) => {
      const idx = findIndex(lowerKeys, OCULUS_VISEME[vs]);
      if (idx !== undefined) visemeIndex[vs] = idx;
    });
    const hasVisemes = Object.keys(visemeIndex).length >= 3; // enough to be a viseme rig

    // 2) ARKit / generic channels.
    const channelIndex: Partial<Record<Channel, number[]>> = {};
    (Object.keys(CHANNEL_ALIASES) as Channel[]).forEach((ch) => {
      const all = findAll(lowerKeys, CHANNEL_ALIASES[ch]);
      if (all.length) channelIndex[ch] = all;
    });
    const hasChannels = Object.keys(channelIndex).length > 0;

    if (!hasVisemes && !hasChannels) return;

    const managed = new Set<number>();
    if (hasVisemes) Object.values(visemeIndex).forEach((i) => managed.add(i));
    else Object.values(channelIndex).forEach((arr) => arr?.forEach((i) => managed.add(i)));

    meshes.push({
      influences: m.morphTargetInfluences,
      visemeIndex,
      channelIndex,
      hasVisemes,
      managed: [...managed],
    });
  });

  return meshes.length ? { meshes } : null;
}

/**
 * Drive a model's mouth morphs toward the given viseme/pose, smoothing each
 * influence so transitions between sounds are natural. Call every frame.
 */
export function applyVisemeMorphs(
  plan: MorphPlan,
  viseme: MouthShape,
  pose: VisemePose,
  smooth: number,
): void {
  for (const mesh of plan.meshes) {
    const targets = new Map<number, number>();

    if (mesh.hasVisemes) {
      for (const key of Object.keys(mesh.visemeIndex) as MouthShape[]) {
        const idx = mesh.visemeIndex[key];
        if (idx !== undefined) targets.set(idx, key === viseme ? 1 : 0);
      }
    } else {
      const set = (ch: Channel, value: number): void => {
        for (const idx of mesh.channelIndex[ch] ?? []) {
          targets.set(idx, Math.max(targets.get(idx) ?? 0, value));
        }
      };
      set('open', pose.open);
      set('funnel', pose.round * 0.8);
      set('pucker', pose.round);
      set('close', pose.press);
      set('wide', pose.wide * 0.6);
    }

    // Relax any managed morph we didn't set this frame.
    for (const idx of mesh.managed) if (!targets.has(idx)) targets.set(idx, 0);

    for (const [idx, value] of targets) {
      const cur = mesh.influences[idx] ?? 0;
      mesh.influences[idx] = lerp(cur, value, smooth);
    }
  }
}
