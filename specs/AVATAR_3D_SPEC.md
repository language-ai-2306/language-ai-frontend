# 🦦 Ollie the Otter — 3D Avatar Delivery Spec (mobile web / React Three Fiber)

A copy-paste technical brief for the **3D / multimedia specialist**. The model is
the app's talking mascot ("your speaking buddy" — see reference image). It must
**lip-sync to real speech**, run smoothly on **mid-range phones in a browser**,
and drop into our **React Three Fiber + three.js** pipeline with no rework.

> **The single most important requirement:** the model MUST ship with **mouth
> blendshapes (morph targets)** using one of the naming standards in §4. Without
> them there is no real lip-sync — this is non-negotiable, not a nice-to-have.

---

## 1) Character (match the reference)

- Bipedal **cartoon otter**, friendly/Pixar-stylized, big expressive eyes, open
  happy smile (tongue + small soft lower teeth visible), whiskers, rounded ears.
- Wearing a **denim-blue hoodie** with a **light-blue speech-bubble + white
  sound-wave** chest logo, cream drawstrings, front pocket.
- Pose: standing, friendly **waving** (full body), facing camera.
- Palette (approx, tune to art): fur `#9C6B3F`, belly/muzzle cream `#E7CBA0`,
  nose `#4A2F23`, eyes warm brown, hoodie `#4F6D8F`, logo bubble `#7FA8CF`.
- Mood: warm, calm, encouraging — kids 5–14. Never sharp/scary.

---

## 2) Geometry / poly count

| Item | Target | Hard cap |
|---|---|---|
| **Triangles** | **18,000 – 30,000** | 40,000 |
| Vertices (post-export) | ~15k – 35k | — (seams inflate this; tris is the metric) |
| Materials | **2** (1 body+hoodie atlas, 1 eyes/teeth/tongue) | 4 |
| Meshes/draw calls | ≤ 4 | 6 |
| Skeleton bones | < 60 | 80 |

Topology rules:
- **Quad-based**, clean, even. Triangulate only on export.
- **Concentric edge loops around the mouth and eyes** — required for clean
  blendshape deformation. Don't skimp on mouth loops.
- Model an **interior mouth**: cavity, **tongue**, small **upper + lower teeth**
  (rounded, friendly) so `jawOpen` reveals a real mouth (the reference is open-mouthed).
- Watertight in deforming areas; no n-gons there.

**Fur:** do NOT use hair cards / particles / strands (too heavy + unsupported in
GLB on mobile). **Bake the fluffy fur look into Base Color + Normal maps** on a
smooth mesh. At most a few **alpha-card tufts** (ear/cheek) if essential.

---

## 3) Skeleton (body) rig

- Standard **humanoid biped** armature (Mixamo-compatible or Ready-Player-Me bone
  naming preferred). Must include at least: `Hips, Spine, Spine1, Spine2, Neck,
  Head`, plus arms/hands for the wave.
- Skinned to a single mesh where possible; max 4 weights/vertex.
- Face is driven by **blendshapes (§4), not bones** — but a `Head` bone is still
  required (we add idle head sway/breathing).
- (A jaw *bone* is optional/secondary; blendshapes are the primary mouth driver.)

---

## 4) Blendshapes / visemes — REQUIRED (lip-sync)

Deliver **one** of these two standards. **ARKit 52 is preferred** (future-proof,
tool-supported, and our driver maps it automatically).

### Option A — ARKit (recommended)
Full ARKit 52 blendshapes ideally; the **minimum our driver needs**:
- Mouth: `jawOpen`, `mouthFunnel`, `mouthPucker`, `mouthClose`,
  `mouthSmileLeft`, `mouthSmileRight`
- Eyes: `eyeBlinkLeft`, `eyeBlinkRight`
- (Recommended extras for expression: `mouthStretchLeft/Right`,
  `browInnerUp`, `cheekSquintLeft/Right`.)

### Option B — Oculus / Ready-Player-Me visemes
The 15 `viseme_*` morphs: `viseme_sil, viseme_PP, viseme_FF, viseme_TH,
viseme_DD, viseme_kk, viseme_CH, viseme_SS, viseme_nn, viseme_RR, viseme_aa,
viseme_E, viseme_I, viseme_O, viseme_U` — **plus** `eyeBlinkLeft`,
`eyeBlinkRight` for blinking.

Notes:
- **Exact names matter** (our driver matches them, case-insensitive). If you must
  use other names, send us the list and we'll add aliases.
- Each viseme/channel must be a clean, full-range (0→1) shape that looks correct
  in isolation, and combinable (no mesh tearing when blended).
- `jawOpen` (or `viseme_aa`) must clearly open the modeled mouth interior.

---

## 5) Animation clips (in-place, looping, named exactly)

In the GLB (or as separate animation GLBs sharing the skeleton):
- `Idle` — calm breathing, occasional blink.
- `Talk` — relaxed talking body motion (we layer visemes on top).
- `Listen` — attentive, slight lean-in.
- `Celebrate` — gentle happy bounce/wave (used on level-complete).
- `Wave` — the greeting from the reference pose.

Keep motion **subtle and friendly** (anxiety-sensitive audience). If body anim is
out of scope, deliver at least `Idle` + `Wave`; we have a procedural idle fallback.

---

## 6) Textures

- **PBR metallic-roughness** (glTF standard). Matte: low metalness, mid roughness.
- **One atlas per material.** Maps:
  - **Base Color** (sRGB) — bake fur detail here
  - **Normal** — bake fur/cloth detail here
  - **ORM** (Occlusion + Roughness + Metallic packed, linear)
  - Emissive only if needed (e.g., eye catchlight) — usually skip
- **Resolution: 1024² preferred, 2048² maximum.** No 4K.
- **Format in the GLB: KTX2 / Basis (UASTC or ETC1S)** for low VRAM. If KTX2 isn't
  possible, WebP/JPG is acceptable (tell us, we handle the decoder).
- Eyes/teeth/tongue can share a small second texture set.

---

## 7) File format, compression & size

- **glTF 2.0 binary `.glb`**, single self-contained file. Name: `ollie.glb`.
- **Compression:** **Draco** (geometry) + **KTX2** (textures). meshopt optional.
  (Tell us what's used — we enable the matching decoders.)
- **File size target: ≤ 3 MB.** Acceptable up to **5 MB**. Hard cap 8 MB.

For reference, our budget rationale: textures dominate size/VRAM, geometry is cheap
(our current placeholder is ~1.8k tris). 1K KTX2 textures + Draco geometry should
land well under 3 MB at 20–30k tris.

---

## 8) Scene conventions (so it drops into three.js cleanly)

- **Up axis: Y-up.** **Forward: +Z** (faces the camera/viewer).
- **Scale: meters.** Whole character ~**1.6 units tall** (real-world-ish).
- **Origin/pivot: between the feet, centered** (x=0, z=0, feet at y=0).
- **Apply/freeze all transforms** — no leftover scale/rotation on root; no negative
  scale; normals recalculated outward.
- Clean, meaningful node/mesh names; one root node.
- glTF-standard materials only (no engine-specific/Unreal/Unity shaders).

---

## 9) Deliverables

1. **`ollie.glb`** — optimized (Draco + KTX2), meeting all specs above.
2. **Source master** — `.blend` (preferred) or `.fbx` with the rig, blendshapes,
   and animations, for future edits.
3. **Texture sources** — PSD / Substance files + exported maps.
4. **Blendshape name list** — exactly which morphs are included (so we verify).
5. Short note on any compression used (Draco/KTX2/meshopt).

---

## 10) Acceptance criteria (we test on receipt)

- [ ] Loads without errors in **https://gltf.report** and in our app.
- [ ] Contains blendshapes with the **required names** from §4; `jawOpen`/`viseme_aa`
      visibly opens the mouth interior (tongue/teeth show).
- [ ] `eyeBlinkLeft/Right` close the eyelids.
- [ ] ≤ **30k triangles** (≤40k hard), ≤ **2K textures**, GLB ≤ **5 MB**.
- [ ] **Y-up, +Z facing, feet at origin**, transforms applied, ~1.6 units tall.
- [ ] Plays at least the `Idle` (and ideally `Wave`) animation clip.
- [ ] Runs at 60 fps on a mid-range phone (e.g. iPhone SE / mid Android) in a browser.

> Quick self-check for the artist: open the GLB in https://gltf.report — confirm
> the **Morph Targets** count and names, triangle count, texture sizes, and file
> size all match this spec before delivery.
