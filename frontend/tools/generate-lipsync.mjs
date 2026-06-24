/**
 * generate-lipsync.mjs — offline lip-sync asset generator.
 *
 * For every phrase in src/companion/data.ts it produces, under public/lipsync/:
 *   <slug>.wav   — the spoken audio (macOS `say` → WAV)
 *   <slug>.json  — Rhubarb mouth-cue timeline [{start,end,value}]
 * plus index.json (slug ↔ phrase map).
 *
 * The app ships these and, at runtime, plays the audio while swapping the mouth
 * shape per cue (deterministic, no runtime speech API). Re-run whenever the
 * phrase list changes.
 *
 * Requirements (macOS): built-in `say` + `afconvert`, and Rhubarb Lip Sync
 * (https://github.com/DanielSWolf/rhubarb-lip-sync). Point RHUBARB at the binary:
 *   RHUBARB=/path/to/rhubarb node tools/generate-lipsync.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'lipsync');
const TMP = join(OUT, '.tmp');
const RHUBARB = process.env.RHUBARB || 'rhubarb';
const VOICE = process.env.SAY_VOICE || 'Samantha';
const RATE = process.env.SAY_RATE || '150';

// MUST stay identical to src/companion/lipsync/slug.ts
function phraseSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// Pull the phrase strings straight out of data.ts (single source of truth).
const dataTs = readFileSync(join(ROOT, 'src', 'companion', 'data.ts'), 'utf8');
const block = dataTs.match(/export const PHRASES[^=]*=\s*\[([\s\S]*?)\];/);
if (!block) throw new Error('Could not find PHRASES in src/companion/data.ts');
const phrases = [...block[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] ?? m[2]);
console.log(`Generating lip-sync for ${phrases.length} phrases…`);

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const index = [];
for (const phrase of phrases) {
  const slug = phraseSlug(phrase);
  const aiff = join(TMP, `${slug}.aiff`);
  const wav = join(OUT, `${slug}.wav`);
  const json = join(OUT, `${slug}.json`);
  const txt = join(TMP, `${slug}.txt`);

  execFileSync('say', ['-v', VOICE, '-r', RATE, '-o', aiff, phrase]);
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@22050', aiff, wav]);
  writeFileSync(txt, phrase);
  execFileSync(RHUBARB, ['-f', 'json', '-o', json, '--dialogFile', txt, wav], {
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  // Strip Rhubarb's absolute soundFile path; keep only duration + cues.
  const parsed = JSON.parse(readFileSync(json, 'utf8'));
  writeFileSync(json, JSON.stringify({ duration: parsed.metadata?.duration ?? 0, mouthCues: parsed.mouthCues }));
  index.push({ slug, phrase });
  console.log('  ✓', slug);
}

writeFileSync(join(OUT, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
rmSync(TMP, { recursive: true, force: true });
console.log(`Done → ${OUT}`);
