# Roadmap — Speech-Therapy Avatar

Direction: a child-friendly 3D avatar that teaches speech-sound production using
**ARKit 52 blendshapes**. The current build (React Three Fiber + three.js,
Pun-Chan VRM with all 52 ARKit shapes, offline Rhubarb lip-sync) is the
foundation. Items below are planned, not yet built.

## Near-term

1. **Phoneme → ARKit therapy mapping** (`companion/lipsync/visemes.ts`)
   Extend the current 5 broad mouth channels into clinical, *exaggerated*
   per-sound targets:
   - bilabials /p,b,m/ → `mouthClose` + `jawOpen 0`
   - labiodentals /f,v/ → `mouthLowerDown_L/R` + `mouthRollLower`
   - rounding /w,u,sh/ → `mouthPucker` + `mouthFunnel`
   - open vowels /a/ → `jawOpen` + `mouthStretch_L/R`
   - /l,t/ → drive **`tongueOut`** (present in the model, currently unused)
   …with an exaggeration multiplier for clarity.
2. **"Show me a sound" mode** — hold/loop a single exaggerated target shape on
   demand, separate from real-time sentence lip-sync.
3. **Side-profile camera** — a control to rotate the avatar ~45° so kids can see
   lip protrusion (rounding sounds). We already drive the camera/model.

## Future — Mirror + Gamification (MediaPipe Face Landmarker)

**Concept.** Show the device's front camera next to the avatar. As the child
tries a sound, track *their* face in real time and **score how close their mouth
is to the avatar's target shape**, awarding points / visual rewards on a good
match. Turns passive imitation into an interactive game.

**Why it's a strong fit for our architecture.** Google's
[MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker)
can output **`faceBlendshapes`** — and it uses the **same ARKit-52 naming**
(`jawOpen`, `mouthPucker`, `mouthFunnel`, `mouthSmileLeft`, …) that already
drives our avatar. So the child's live blendshape vector is **directly
comparable** to the avatar's target morph weights — no separate mapping layer.

```
score = 1 - normalizedDistance(childBlendshapes[targetKeys], avatarTargetWeights[targetKeys])
```
Compare only the keys relevant to the current sound (e.g. for /w/: `mouthPucker`,
`mouthFunnel`), smooth over a short window, reward when score crosses a threshold.

**Requirements / constraints.**
- **HTTPS required.** Browser camera access (`getUserMedia`) only works on
  `localhost` or HTTPS. On any other device this needs a tunnel
  (cloudflared/ngrok) in dev, or a real HTTPS deployment in prod.
- **Privacy (kids).** MediaPipe Face Landmarker runs **fully on-device** (WASM in
  the browser) — no video leaves the device. Keep it that way; surface a clear
  camera-permission explainer. Important for a children's product.
- **Dependency.** `@mediapipe/tasks-vision` (FaceLandmarker, `outputFaceBlendshapes: true`).

**Sketch of the work.**
1. Add a `MirrorPanel` component: webcam `<video>` + a `FaceLandmarker` loop
   (`detectForVideo`) producing live ARKit blendshape scores.
2. A `useMouthMatch(target)` hook comparing live scores to the active target and
   returning a 0..1 match value.
3. Wire match → points/feedback in the practice flow; reuse the existing
   confetti/level-complete reward UI.
4. Ship behind HTTPS (tunnel in dev) and gate on camera permission with a
   kid/parent-friendly prompt.

**Open questions.** Per-sound thresholds (tune with real users); accessibility
for kids who can't/won't use the camera (must stay fully optional); lighting
robustness.
