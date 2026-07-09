# 🤝 Language AI — Engineering Handoff

> **For the next Claude agent (Opus 4.8).** Read this first, then `PROJECT_OVERVIEW.md`
> (business/product) and `backend/README.md` (API details). This file captures the
> engineering state, decisions, and next steps as of **2026-06-23**.

---

## 0. TL;DR (read me first)

- **What this is:** a voice-first speech-practice companion for children (5–14) who
  stutter. User repeats a known phrase → audio is analysed → encouraging feedback +
  scores. Companion to therapy, not a replacement. Full product vision in
  `PROJECT_OVERVIEW.md`.
- **What's working now (this session's build):** the full **record → stream → analyse
  → feedback → retry** loop, end-to-end, on a local stack. Audio streams from the
  browser over a **WebSocket** and is saved on the backend; an analysis **pipeline**
  runs and returns feedback that the UI displays.
- **The catch:** the actual **detection model is a deterministic STUB**. Everything
  *around* the model is real (upload, validation, storage, scoring shape, feedback,
  UI). Swapping the stub for a real model is the headline next step.
- **Repo state:** ⚠️ **nothing is committed yet** — all work is in the working tree on
  branch `main`. See §6.
- **Tests:** 14 backend tests pass (`cd backend && .venv/bin/python -m pytest -q`).
  Frontend typechecks clean (`cd frontend && npm run typecheck`).

---

## 1. Current architecture (as built)

```
Browser (React)                         FastAPI backend
─────────────                           ───────────────
MediaRecorder (useMicRecorder)
  └─ emits a chunk every 250ms
AudioUploadSocket (api/audioSocket.ts)
  └─ WebSocket  ───────────────────►   /api/attempts/ws  (routers/attempts.py)
       start{exercise,target,mime}        ├─ origin check (CORS bypass)
       <binary chunks…>                    ├─ stream chunks → data/attempts/<id>.<ext>
       end{durationMs}                     ├─ on end: analyze_attempt()  (analysis.py)
                                           │     1. validate_audio        (step 5)
  ◄───────  status{"analyzing"}            │     2. to_model_input  STUB  (step 6)
  ◄───────  feedback{...}  or  error{...}  │     3. detect_events   STUB  (steps 7–8) ← MODEL SEAM
FeedbackCard.tsx renders feedback          │     4. build_feedback        (step 9)
PracticeScreen: Try again / Next           └─ write <id>.<ext>.json sidecar + send feedback
```

- **Transport is a WebSocket, not REST.** Chosen so chunks upload *while the child is
  still speaking* (low latency, sub-300ms feel) and so feedback/analysis can stream
  back on the same connection. (Note: `PROJECT_OVERVIEW.md` says "REST API" — this is a
  deliberate deviation for the audio path; see §4.)
- **Audio is persisted** to `backend/data/attempts/` (git-ignored) as `<uuid>.webm` +
  a `<uuid>.webm.json` metadata sidecar (`exercise`, `target`, `durationMs`, `bytes`,
  `mime`). This is the input seam for the future model / training set.

---

## 2. Completed work (this session)

**Backend**
- New `backend/app/routers/attempts.py` — WebSocket `/api/attempts/ws`: streamed audio
  upload, origin check, size cap, mime allow-list, reassembly to disk, runs the
  pipeline off the event loop (`asyncio.to_thread`), returns `status` + `feedback`.
- New `backend/app/analysis.py` — the 4-stage pipeline with each stage as a swappable
  function. `detect_events` is the **clearly-marked MODEL SEAM** (deterministic stub).
- New schemas in `backend/app/schemas.py` — `EventType`, `DetectedEvent`,
  `AttemptFeedback`.
- `backend/app/config.py` — added `audio_storage_dir`, `max_audio_bytes` (25 MiB),
  `min_audio_bytes` (64).
- Threaded the **reference phrase (`target`)** through `analyze_attempt → detect_events`
  so the model can compare speech against the expected phrase ("find issues in the
  sentence"). Verified: different phrases → different stub output.
- New `backend/tests/test_attempts.py` (6 tests) — feedback shape, determinism, target
  threading, and rejection cases. Total suite: **14 passing**.

**Frontend**
- New `frontend/src/api/audioSocket.ts` — `AudioUploadSocket` (live chunk streaming,
  status relay, resolves with `AttemptFeedback`) + one-shot `submitAttempt` helper.
- `frontend/src/hooks/useMicRecorder.ts` — now streams chunks via an `onChunk` callback
  and a 250ms timeslice; exposes the chosen mime type.
- `frontend/src/screens/PracticeScreen.tsx` — opens the socket on record, streams live,
  shows an "analysing" state, renders feedback, supports **Try again / Next**.
- New `frontend/src/components/FeedbackCard.tsx` + `.css` — shows the phrase, a
  smoothness meter, tips, and a "For grown-ups" disclosure with events + timestamps.
- **Modern/minimal UI rework of the practice + feedback flow** (user-approved): scoped
  via `.screen--minimal` + additive `--m-*` tokens in `index.css`; restyled
  `MicButton.css`, practice styles in `screens.css`. Other screens left untouched.
- `frontend/vite.config.ts` — `ws: true` on the `/api` proxy (required for the WS).
- Removed the old no-op `submitAttempt` stub from `api/client.ts`.

**Docs (this session)**
- `PROJECT_OVERVIEW.md` — full business/product overview (provided by the founder).
- `specs/UI_DESIGN_PROMPT.md` — master UI design prompt to generate design docs.
- `HANDOFF.md` — this file.

---

## 3. Key decisions & rationale

| Decision | Why |
|---|---|
| **WebSocket** for audio upload (not multipart POST) | Streams during recording → only the tail uploads on stop; persistent channel for status + future streamed analysis; supports the sub-300ms feel. |
| **Pipeline as 4 swappable functions** (`analysis.py`) | The real model drops into `detect_events` without touching the router or schemas. |
| **Deterministic stub** for detection | Lets the whole product loop + UI be exercised end-to-end before the ML model exists; stable for tests. |
| **`target` phrase threaded into the model** | Core use case is "user repeats a *known* phrase and we find issues in it" — the model needs the reference text. |
| **Encouraging-only feedback**, single positive "smoothness" score in the child UI | Product rule: never negative to a child. Raw clinical events live behind a "For grown-ups" disclosure. |
| **Local disk storage** (`data/attempts/`), git-ignored | Simplest working seam; Postgres + S3 are the intended production targets (not built). |
| **Modern/minimal** styling scoped to practice+feedback only | User chose this scope/style; additive tokens avoid disturbing other (gamified) screens. |
| **Shallow audio validation** (declared mime + size) only | User explicitly deferred deep validation; real decode-validation belongs in the convert step once a model is chosen. |

---

## 4. ⚠️ Spec vs. build deltas (reconcile these intentionally)

`PROJECT_OVERVIEW.md` describes the target architecture; the current build is a working
skeleton that differs. None are bugs — they're scope/sequencing choices to confirm:

| Overview (target) | Current build |
|---|---|
| STT via **faster-whisper** (word-level timestamps) | None — `detect_events` is a stub |
| **Rule-based** detection vs. the known phrase | `target` is passed in; comparison logic not written |
| **5** disfluency types incl. **revisions** | 4 in `EventType` (`repetition, prolongation, block, interjection`) — **`revision` missing** |
| **Fluency / Confidence / Clarity** scores (+ WPM, pause, stutter %, repetition count) | single `smoothness` score only |
| **PostgreSQL + SQLAlchemy + Alembic** | no DB |
| **AWS S3** audio storage | local `data/attempts/` |
| **REST** API to ML service | **WebSocket** for the audio path (REST `/api/chat` still exists) |
| **100** clinically-designed phrases | 8 read sentences + 12 repeat words (placeholders) in `frontend/src/store/data.ts` |
| Parent / Therapist dashboards | not built (child app only) |

---

## 5. How to run & verify

**Servers** (both were running at handoff time):
```bash
# Backend (FastAPI, auto-reload) — http://localhost:8000  (docs at /docs)
cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

# Frontend (Vite + React) — http://localhost:5173  (proxies /api → :8000, ws:true)
cd frontend && npm run dev
```

**Verify:**
```bash
cd backend  && .venv/bin/python -m pytest -q          # 14 passing
cd frontend && npm run typecheck                       # clean
```

**Exercise the loop:** open http://localhost:5173 → **Read aloud** / **Repeat after me**
→ tap mic, speak, stop → see "Listening…" → feedback card → "Try again" / "Next".
Saved clips appear in `backend/data/attempts/`.

**WebSocket protocol** (mirror in `backend/app/routers/attempts.py` &
`frontend/src/api/audioSocket.ts`):
```
client → {"type":"start","exercise":str,"target":str|null,"mime":str}
client → <binary audio chunk> …
client → {"type":"end","durationMs":int}
server → {"type":"status","status":"analyzing"}
server → {"type":"feedback", ...AttemptFeedback}   | {"type":"error","detail":str}
```

---

## 6. Repo state & git

- Branch: **`main`**. Last commit: `f6239b0 Rework UI into a gamified speech-practice app`.
- **Nothing from this session is committed.** Modified + new files (see `git status`):
  - Modified: `.gitignore`, `backend/README.md`, `backend/app/{config,main,schemas}.py`,
    `frontend/src/api/client.ts`, `frontend/src/hooks/useMicRecorder.ts`,
    `frontend/src/index.css`, `frontend/src/screens/{PracticeScreen.tsx,screens.css}`,
    `frontend/src/types/index.ts`, `frontend/src/components/MicButton.css`,
    `frontend/vite.config.ts`
  - New: `backend/app/analysis.py`, `backend/app/routers/attempts.py`,
    `backend/tests/test_attempts.py`, `frontend/src/api/audioSocket.ts`,
    `frontend/src/components/FeedbackCard.{tsx,css}`, `PROJECT_OVERVIEW.md`,
    `specs/UI_DESIGN_PROMPT.md`, `HANDOFF.md`
- **Suggested commit grouping** when the user approves:
  1. backend audio pipeline (`attempts.py`, `analysis.py`, schemas, config, tests, README)
  2. frontend audio streaming + feedback (`audioSocket.ts`, `useMicRecorder.ts`,
     `PracticeScreen.tsx`, `FeedbackCard.*`, `client.ts`, `vite.config.ts`, types)
  3. UI minimal rework (CSS/token changes)
  4. docs (`PROJECT_OVERVIEW.md`, `specs/UI_DESIGN_PROMPT.md`, `HANDOFF.md`)
- Commit/push **only when the user asks** (per their workflow).

---

## 7. Gotchas / things to know

- **`ws: true`** must stay on the Vite `/api` proxy or the WebSocket 404s in dev.
- **No data retention policy.** Children's speech audio accumulates in
  `data/attempts/` forever. Add retention/consent before any real-user testing.
- **Validation is shallow** (declared mime + size). Bytes aren't verified to be real
  audio; duration is client-reported. Deferred by the user — real validation should
  ride along with the convert step (decoding fails on garbage).
- **Convert step is a pass-through** (`to_model_input`). Browsers send webm/opus; most
  models want 16 kHz mono WAV — wire ffmpeg here when the model is picked.
- **`detect_events` does NOT analyse speech.** It hashes the audio (+target) for stable
  fake output. Do not trust its events as real.
- The **`/api/chat`** endpoint (avatar small-talk, dummy or Claude) is separate and
  unrelated to the practice pipeline.
- Local memory note for this project exists in the agent's auto-memory
  (`languageai-project`); it's been updated to reflect this session.
- **Browser Back/Forward is wired to the state router** (`frontend/src/store/AppStore.tsx`).
  Navigation lives in `state.screen` (not React Router), so history must be synced by
  hand. Three pieces, all in `AppProvider`:
  1. A once-effect **seeds** the current entry (`history.replaceState({ screen }, '')`)
     and listens for `popstate` — on Back/Forward it sets `fromPopRef` and dispatches
     `navigate` to `e.state.screen` (falls back to `landing`).
  2. An effect on `[state.screen]` **mirrors** every screen change into history —
     `pushState` normally, `replaceState` for redirects (see below), skipping changes
     that came from `popstate` (`fromPopRef`) and the already-seeded first entry
     (`history.state?.screen === state.screen`).
  3. **Redirects** (`logout()` and the 401/`UNAUTHORIZED_EVENT` handler) set
     `replaceNextRef.current = true` before dispatching, so Back never returns to a
     now-invalid signed-in screen.
  Gotcha: the seed effect **must be defined before** the mirror effect, or the mirror's
  first run pushes a duplicate entry on mount. The URL is intentionally left unchanged
  (`pushState(state, '')` with no url arg), so the existing `?screen=`/`?doctor=`/`?reset=`
  deep-link params are untouched. Any *new* place that sets `screen` directly in the
  reducer (e.g. `startGame` → `companion`) automatically becomes a Back target since it
  flows through `state.screen`; use the `replaceNextRef` pattern if a transition should
  NOT be one.

---

## 8. Recommended next steps (priority order)

1. **Replace the detection stub with the real model** — implement STT (faster-whisper,
   word-level timestamps) + rule-based comparison vs. `target` inside
   `detect_events` (or call out to a separate ML service). This is the core value.
2. **Implement the convert step** (`to_model_input`) — ffmpeg → 16 kHz mono WAV; this
   also gives real audio validation + true duration.
3. **Align scores to spec** — add Fluency / Confidence / Clarity (+ WPM, average pause,
   stutter %, repetition count) to `AttemptFeedback` & `build_feedback`; surface in UI.
4. **Add the `revision` disfluency type** to `EventType` and the tips/labels.
5. **Phrase content** — replace placeholders in `store/data.ts` with the (pending)
   100 clinically-designed phrases; model phrases as data (id, text, difficulty, focus).
6. **Persistence** — introduce PostgreSQL (SQLAlchemy + Alembic) for attempts/scores/
   plans, and move audio to S3; keep `data/attempts/` as a local-dev fallback.
7. **Data retention & consent** before real-user testing.
8. **Grown-up surfaces** — parent & therapist dashboards + the therapist plan builder
   (use `specs/UI_DESIGN_PROMPT.md` to generate the design docs first).
9. **Commit** the current work once the user approves (see §6 grouping).

---

*Questions for the next agent to confirm with the user before large changes:* keep the
WebSocket audio path or converge to REST per the overview? Single ML service or in-process
detection? Are the 100 phrases available yet?
