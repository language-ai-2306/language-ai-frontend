/**
 * phraseSlug — stable filename for a phrase's lip-sync assets.
 * MUST stay identical to the copy in tools/generate-lipsync.mjs.
 */
export function phraseSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
