# 3D Model Backups — Demo Safety Net

A **known-good copy** of the avatar we got working, so we can swap in other
candidate models to evaluate them and, if none are better, restore this one for
the demo.

## Files (kept locally only — git-ignored, too large to version)

- `punchan-working.glb` — the exact GLB currently wired into the app
  (a copy of `frontend/public/models/punchan.glb`). VRM 0.x with the full
  **ARKit 52** blendshapes.
- `punchan-source.vrm` — the original download (same data, `.vrm` extension).
  Also present at `~/Downloads/uploads_files_4831652_punchan+vrm.vrm`.

## The matching code state

The framing, lip-sync, and hand-idle tuning for this model live in the commit
tagged **`demo-working`**. The model file is git-ignored, so the **tag restores
the code** and **this folder restores the model**.

## How to restore the working demo

```sh
# 1) restore the code state
git checkout demo-working        # or: git checkout main, if you stayed on it

# 2) restore the model file
cp backups/3d-models/punchan-working.glb frontend/public/models/punchan.glb

# 3) confirm the app points at it — frontend/.env.local should contain:
#      VITE_AVATAR_KIND=rpm
#      VITE_RPM_AVATAR_URL=/models/punchan.glb

# 4) restart the dev server
cd frontend && npm run dev
```

## To try a different model

Drop the new file in `frontend/public/models/`, point `VITE_RPM_AVATAR_URL` at
it, and restart. If it doesn't match, restore with the steps above.
