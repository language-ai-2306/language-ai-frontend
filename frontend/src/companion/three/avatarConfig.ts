/**
 * avatarConfig — chooses which 3D avatar to render and (for Ready Player Me)
 * where to load it from. Configured via Vite env so it can change without code:
 *
 *   VITE_AVATAR_KIND = fox | rpm          (default: fox)
 *   VITE_RPM_AVATAR_URL = https://models.readyplayer.me/<id>.glb
 *
 * Create an avatar in ~30s at https://readyplayer.me/avatar, copy its .glb URL
 * into VITE_RPM_AVATAR_URL, and restart the dev server. The morph-target query
 * params the lip-sync driver needs are appended automatically if you omit them.
 */
export type AvatarKind = 'fox' | 'rpm' | 'mascot';

/** A documented RPM sample; replace with your own URL if this 404s. */
const DEFAULT_RPM_URL = 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb';

/** Blendshapes the viseme driver maps to (Oculus visemes + ARKit + eye blink). */
const REQUIRED_MORPHS = 'Oculus Visemes,ARKit,eyeBlinkLeft,eyeBlinkRight';
/** Keep the download light enough for phones. */
const PERF_PARAMS = 'textureAtlas=1024&lod=1';

const KIND = ((import.meta.env.VITE_AVATAR_KIND as string) || '').toLowerCase();
export const AVATAR_KIND: AvatarKind =
  KIND === 'rpm' ? 'rpm' : KIND === 'mascot' ? 'mascot' : 'fox';

/**
 * Ensure the RPM GLB ships with the mouth/eye blendshapes we drive. These query
 * params are baked by Ready Player Me's CDN, so only append them for RPM URLs —
 * a local/self-hosted GLB (e.g. /models/punchan.glb) already has its morphs and
 * would just get meaningless query noise.
 */
function ensureMorphTargets(url: string): string {
  if (!/readyplayer\.me/i.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  const extras: string[] = [];
  if (!/morphTargets=/.test(url)) extras.push(`morphTargets=${REQUIRED_MORPHS}`);
  if (!/textureAtlas=/.test(url)) extras.push(PERF_PARAMS);
  return extras.length ? `${url}${sep}${extras.join('&')}` : url;
}

export const RPM_AVATAR_URL = ensureMorphTargets(
  (import.meta.env.VITE_RPM_AVATAR_URL as string) || DEFAULT_RPM_URL,
);

/** A fixed 3D camera framing (no user controls). */
export interface CameraPreset {
  position: [number, number, number];
  fov: number;
}

/**
 * Default camera framing per avatar kind — used by the GAME (CompanionScreen,
 * both converse + repeat) and as the fallback anywhere a screen doesn't pass its
 * own. The mascot is dollied back with a moderate FOV: a prominent, flat
 * (non-looming) full-body shot.
 */
export const CAMERA: CameraPreset =
  AVATAR_KIND === 'rpm'
    ? { position: [0, 0, 1.4], fov: 28 }
    : AVATAR_KIND === 'mascot'
      ? { position: [0, 0, 17.0], fov: 22 }
      : { position: [0, 0.55, 7.0], fov: 40 };

/**
 * Home hero framing — a narrower FOV than the game (fov 12: more zoomed / flatter)
 * so the companion reads larger in the shorter hero band. Screens that reuse the
 * home hero (e.g. the Repeat picker) use this too. Non-mascot kinds fall back.
 */
export const HOME_CAMERA: CameraPreset =
  AVATAR_KIND === 'mascot' ? { position: [0, 0, 20.0], fov: 12 } : CAMERA;
