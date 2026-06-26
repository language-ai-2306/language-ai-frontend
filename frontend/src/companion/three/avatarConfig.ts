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
export type AvatarKind = 'fox' | 'rpm';

/** A documented RPM sample; replace with your own URL if this 404s. */
const DEFAULT_RPM_URL = 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb';

/** Blendshapes the viseme driver maps to (Oculus visemes + ARKit + eye blink). */
const REQUIRED_MORPHS = 'Oculus Visemes,ARKit,eyeBlinkLeft,eyeBlinkRight';
/** Keep the download light enough for phones. */
const PERF_PARAMS = 'textureAtlas=1024&lod=1';

export const AVATAR_KIND: AvatarKind =
  ((import.meta.env.VITE_AVATAR_KIND as string) || '').toLowerCase() === 'rpm' ? 'rpm' : 'fox';

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
