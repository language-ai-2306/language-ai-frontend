# 🦊 Language AI — 3D Companion Model Prompt

A copy-paste brief for generating/commissioning the app's avatar. Built from
`PROJECT_OVERVIEW.md`: a voice-first speech-practice companion for **children
aged 5–14 who stutter**. The mascot must feel **safe, warm, and never
intimidating**, and must be able to **talk (lip-sync), listen, think, and
celebrate** inside a real-time web app (React Three Fiber).

---

## 1) Quick prompt — for AI text/image-to-3D (Meshy, Tripo, Rodin, Luma)

> Cute cuddly original cartoon companion creature for a children's app — a small
> round baby fox-like character with an oversized friendly head, big soft
> sparkling eyes, tiny rounded ears, chubby cheeks, a gentle closed-mouth smile,
> short stubby limbs, and a soft fluffy tail. Smooth rounded low-poly stylized
> shapes, soft matte pastel colors (warm cream fur, gentle indigo and mint
> accents, rosy cheeks). Friendly, calm, reassuring, plush-toy feel. Front-facing
> A-pose, neutral expression, full body, centered, soft even lighting, plain
> background. Mobile game art style, clean topology.

**Negative / avoid:** realistic fur or skin, sharp teeth, claws, scary or angry
expression, humanlike proportions, busy textures, dark/gloomy colors, logos,
text, and anything resembling Talking Tom (do not make a grey tabby house cat in
that style — pick a distinct species, silhouette, and palette).

---

## 2) Character brief (concept & personality)

- **Who:** an original, huggable baby-animal mascot (fox / cat / bear / bunny or
  a friendly blob-creature — your pick, but **original**, not a known character).
- **Personality to convey through the pose/face:** patient, gentle, encouraging,
  a little playful — a calm friend who is never disappointed in you. This matters:
  the app's #1 rule is emotional safety (no judgement, no "wrong").
- **Neoteny = cuteness:** big head relative to body, large low-set eyes, small
  nose/mouth, rounded everything, soft belly. Plush-toy proportions.
- **Visual language (match the app):** soft matte surfaces, warm cream base with
  **indigo (#6867D8)** and **mint (#56C7B2)** accents, **rosy cheeks (#FFB3B3)**,
  deep-navy (#26364D) eyes. Calm pastel, high readability, low contrast clutter.

---

## 3) Technical requirements (so it drops into the app)

The avatar loads in React Three Fiber via `useGLTF`. Please deliver a model that
meets these specs:

- **Format:** glTF 2.0 — a single self-contained **`.glb`** (embed geometry,
  textures, and animations). Name it `companion.glb`.
- **Performance (mobile/web):** low-poly, **~8,000–30,000 triangles**. Textures
  ≤ **1024×1024** (or use vertex colors / a tiny palette atlas). One material set.
- **Orientation & scale:** **Y-up**, facing **+Z** (toward the camera), standing
  upright, **feet at y = 0**, centered on X. Roughly **1.5–2 units tall**. Apply
  all transforms (no leftover scale/rotation on the root).
- **Rig:** a clean humanoid-ish/animal armature with a **Head bone** and — most
  importantly — a working **Jaw bone OR mouth blendshapes/visemes** so the mouth
  can open and close for lip-sync. (The current placeholder model has no jaw, so
  "talking" is faked — a real jaw/visemes is the key upgrade.)
  - Ideal blendshapes (morph targets), if used: `mouthOpen` (or visemes `AA`,
    `OO`, `MM`, `EE`), `blink`, and optional `smile`.
  - If a bone jaw instead: name it `Jaw` so we can drive it directly.
- **Animation clips (in-place, looping, named exactly):**
  - `Idle` — gentle breathing/blink, calm.
  - `Talk` — relaxed talking body motion (we layer mouth open on top).
  - `Listen` — attentive, ears perked, leaning in slightly.
  - `Think` — head tilt up, pondering.
  - `Celebrate` — a happy bounce/clap (gentle, not overstimulating).
  - `Encourage` — a warm, reassuring nod/gesture.
  - Keep them subtle and friendly; no aggressive or fast motions.
- **Materials:** simple PBR or unlit/toon, matte (low metalness, mid roughness).
- **No** rigged physics, no external file references, no Draco compression
  (or if Draco, say so — we'd add the decoder).

---

## 4) Reality check on tools (important)

- **AI generators (Meshy/Tripo/Rodin)** are great for the *mesh + look*, but they
  usually **don't produce a usable rig, jaw, visemes, or named animation clips**.
  Plan to **rig + add a jaw bone or `mouthOpen` blendshape + author the clips in
  Blender** afterward (or commission that step).
- **Mixamo** auto-rigs + animates **humanoid** models only — not animals. Useful
  only if you go with a humanoid-ish mascot.
- **Cleanest path to lip-sync:** commission a 3D artist with this brief, or start
  from a CC0 rigged base and add a `Jaw` bone / `mouthOpen` shape key in Blender,
  then export GLB.
- **Licensing:** for a commercial product, use **CC0** (no attribution) or a
  properly licensed/commissioned asset. Avoid anything depicting trademarked
  characters.

---

## 5) Hand-off checklist

- [ ] Single `companion.glb`, self-contained, < ~8 MB
- [ ] Y-up, faces +Z, feet at y=0, centered, transforms applied
- [ ] ≤ ~30k tris, textures ≤ 1k (or vertex colors)
- [ ] `Head` bone + `Jaw` bone **or** `mouthOpen`/viseme blendshapes (+ `blink`)
- [ ] Clips: `Idle`, `Talk`, `Listen`, `Think`, `Celebrate`, `Encourage`
- [ ] Cute, soft, non-intimidating; original (no Talking Tom resemblance)
- [ ] CC0 or properly licensed for commercial use

> Drop the finished file at `frontend/public/models/companion.glb` and the app
> can be pointed at it (and use the real jaw/visemes for lip-sync instead of the
> current faked head-chatter).
