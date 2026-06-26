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

// --- Phoneme → ARKit therapy mapping ----------------------------------------
//
// Clinical, slightly exaggerated ARKit blendshape targets per speech-sound
// group (see docs/ROADMAP.md). Weights are 0..1 morph influences keyed by exact
// ARKit names — so the SAME table can later score a child's live face from
// MediaPipe (which reports ARKit-named blendshapes). The real-time lip-sync maps
// Rhubarb's coarse mouth shapes (A–H) onto these groups.

/** ARKit blendshape name → influence (0..1). */
export type ArkitWeights = Partial<Record<string, number>>;

/** Clarity multiplier — kids learn from exaggeration. Applied then clamped to 1. */
const EXAGGERATION = 1.15;

/** Target mouth shape per speech-sound group, in exact ARKit blendshape names. */
export const PHONEME_ARKIT: Record<string, ArkitWeights> = {
  rest: {},
  // /p/ /b/ /m/ — lips pressed fully shut
  bilabial: { mouthClose: 1.0 },
  // /f/ /v/ — top teeth resting on the lower lip
  labiodental: { mouthRollLower: 0.7, mouthLowerDownLeft: 0.5, mouthLowerDownRight: 0.5, jawOpen: 0.1 },
  // /w/ "oo" — tight lip rounding
  round: { mouthPucker: 1.0, mouthFunnel: 0.5, jawOpen: 0.1 },
  // /o/ "aw"/"oh" — open rounding
  openRound: { jawOpen: 0.45, mouthFunnel: 0.6, mouthPucker: 0.3 },
  // /a/ "ah" — maximum jaw opening
  open: { jawOpen: 0.95, mouthStretchLeft: 0.4, mouthStretchRight: 0.4 },
  // "eh"/"ae" — mid-open
  mid: { jawOpen: 0.45, mouthStretchLeft: 0.3, mouthStretchRight: 0.3 },
  // "ee"/"i" + many consonants — wide, teeth showing
  wide: { mouthSmileLeft: 0.45, mouthSmileRight: 0.45, jawOpen: 0.12, mouthPressLeft: 0.15, mouthPressRight: 0.15 },
  // /l/ — tongue tip up/forward; tongueOut makes the placement visible
  lateral: { tongueOut: 0.5, jawOpen: 0.4 },
};

/** Which speech-sound group each Rhubarb mouth shape maps to. */
const RHUBARB_TO_PHONEME: Record<MouthShape, string> = {
  X: 'rest',
  A: 'bilabial', // p, b, m
  B: 'wide', // many consonants, "ee"
  C: 'mid', // "eh", "ae"
  D: 'open', // "ah"
  E: 'openRound', // "aw", "oh"
  F: 'round', // "oo", w
  G: 'labiodental', // f, v
  H: 'lateral', // l
};

/** Resolved ARKit target weights for a Rhubarb mouth shape (exact-name keys). */
export function arkitWeightsForViseme(v: MouthShape): ArkitWeights {
  return PHONEME_ARKIT[RHUBARB_TO_PHONEME[v]] ?? {};
}

/** Lowercased lookup the runtime driver uses (built once at module load). */
const RHUBARB_ARKIT_LC: Record<MouthShape, Map<string, number>> = (() => {
  const out = {} as Record<MouthShape, Map<string, number>>;
  for (const v of Object.keys(RHUBARB_TO_PHONEME) as MouthShape[]) {
    const m = new Map<string, number>();
    for (const [name, w] of Object.entries(arkitWeightsForViseme(v))) {
      if (w !== undefined) m.set(name.toLowerCase(), w);
    }
    out[v] = m;
  }
  return out;
})();

/** Canonical (lowercased) ARKit name → rig name candidates (handles rig typos). */
const ARKIT_ALIASES: Record<string, string[]> = {
  mouthlowerdownleft: ['mouthlowerdownleft', 'mouthlowerdownletf'], // Pun-Chan rig typo
};

/** Every ARKit shape the therapy table drives (lowercased) — for resolution + relax. */
const ARKIT_DRIVEN: string[] = [
  ...new Set(
    Object.values(PHONEME_ARKIT).flatMap((w) => Object.keys(w).map((k) => k.toLowerCase())),
  ),
];

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

interface MorphMesh {
  influences: number[];
  /** Direct viseme → morph index (Oculus rigs). */
  visemeIndex: Partial<Record<MouthShape, number>>;
  /** Canonical (lowercased) ARKit name → morph index (ARKit rigs). */
  arkit: Map<string, number>;
  hasVisemes: boolean;
  hasArkit: boolean;
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

    // 2) ARKit blendshapes — resolve each therapy-driven shape by exact name.
    const arkit = new Map<string, number>();
    for (const name of ARKIT_DRIVEN) {
      for (const cand of ARKIT_ALIASES[name] ?? [name]) {
        const idx = lowerKeys.get(cand);
        if (idx !== undefined) {
          arkit.set(name, idx);
          break;
        }
      }
    }
    const hasArkit = arkit.size > 0;

    if (!hasVisemes && !hasArkit) return;

    const managed = new Set<number>();
    if (hasVisemes) Object.values(visemeIndex).forEach((i) => managed.add(i));
    else arkit.forEach((i) => managed.add(i));

    meshes.push({
      influences: m.morphTargetInfluences,
      visemeIndex,
      arkit,
      hasVisemes,
      hasArkit,
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
      // ARKit therapy weights for the current sound (exaggerated, clamped).
      const weights = RHUBARB_ARKIT_LC[viseme] ?? RHUBARB_ARKIT_LC.X;
      for (const [name, idx] of mesh.arkit) {
        targets.set(idx, Math.min(1, (weights.get(name) ?? 0) * EXAGGERATION));
      }
      // No Rhubarb cue (e.g. browser TTS) but we have a raw amplitude → open jaw.
      if (viseme === 'X' && pose.open > 0.001) {
        const jaw = mesh.arkit.get('jawopen');
        if (jaw !== undefined) targets.set(jaw, Math.min(1, pose.open));
      }
    }

    // Relax any managed morph we didn't set this frame.
    for (const idx of mesh.managed) if (!targets.has(idx)) targets.set(idx, 0);

    for (const [idx, value] of targets) {
      const cur = mesh.influences[idx] ?? 0;
      mesh.influences[idx] = lerp(cur, value, smooth);
    }
  }
}
