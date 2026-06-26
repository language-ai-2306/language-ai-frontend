# LanguageAI — System Architecture & Model Integration Contract

**Version:** 1.0 (draft for review)
**Date:** 24 June 2026
**Status:** MVP in progress — frontend functional, backend running with a stubbed detection model
**Audience:** App developer (frontend + backend) and ML collaborator (stutter-detection model)

---

## 1. Purpose of this document

LanguageAI is a speech-practice application that listens to a person reading or repeating a
phrase, detects speech dysfluencies (e.g. stuttering events), and returns gentle, child-friendly
feedback plus gamified encouragement. This document defines the system architecture and — most
importantly — the **Model Integration Contract** between the application and the detection model,
so that the app and the model can be built independently and plugged together without rework.

> ⚠️ **The single most important section is §7 (Model Integration Contract).** Until the model's
> input/output format is agreed and frozen, the frontend, backend, and model cannot be built in
> parallel safely. Treat §7 as the shared agreement to sign off on first.

---

## 2. Key architectural decisions (already made)

| Decision | Choice | Rationale |
|---|---|---|
| Backend shape | Modular monolith (single FastAPI app), *not* microservices | Far simpler to build/deploy; responsibilities are still separated by module. Split the model into its own service only when inference needs a GPU or independent scaling. |
| Feedback timing | Per-attempt (analyse after the phrase is finished), not word-by-word live coaching | Avoids partial-prediction, buffering, and GPU-concurrency complexity. Interrupting a speaker mid-phrase is also a worse UX. |
| Transport | WebSocket streaming of audio chunks during recording; analysis triggered on the `end` frame | Already implemented. A hybrid: chunks stream as they are produced, but the model still sees a *complete* recording. Keeps the door open to true live feedback later without re-plumbing the client. |
| Detection vs. feedback | Hard boundary — the model reports *events*; the backend converts events into *safe feedback* | Lets the model be swapped freely, allows low-confidence rejection, and ensures user-facing wording is clinician-approved rather than model-generated. |
| Model interface | A single `StutterDetector` protocol with a swappable implementation | Local in-process call now (stub); HTTP call to a model container later — without touching callers. |
| Persistence | None yet (stateless). PostgreSQL planned. | The MVP runs end-to-end without a DB. Add persistence when progress history / multi-session tracking is needed. |

---

## 3. Current state (what exists today)

An honest snapshot so the collaborator knows exactly what is real versus stubbed.

### Backend (`backend/`, FastAPI 0.115 + Pydantic 2)

- **Endpoints:**
  - `GET /api/health` — liveness + version.
  - `POST /api/chat` — avatar chat. Uses Claude (`claude-opus-4-8`) via the Anthropic SDK with
    structured outputs when an API key is configured; falls back to a deterministic dummy
    generator otherwise. Returns `{reply, mood, word_count}`.
  - `WS /api/attempts/ws` — the practice pipeline. Client sends a `start` frame (exercise, target
    sentence, mime type), streams binary audio chunks, then an `end` frame; server replies with feedback.
- **Analysis pipeline** (`app/analysis.py`): `validate_audio()` → `to_model_input()` →
  `detect_events()` → `build_feedback()`. The whole pipeline runs end-to-end today.
- **The detection model is a STUB.** `detect_events()` derives plausible events deterministically
  from a SHA-256 hash of the audio bytes + target sentence. It does *not* analyse speech. This is
  the explicit seam (marked in the source) to be replaced by the real model.
- **No database, no authentication** yet. Audio is written to disk (`data/attempts/`) with a JSON
  metadata sidecar as the input seam for the future model.

### Frontend (`frontend/`, React 18 + TypeScript + Vite)

- Fully functional, gamified UI: Home, Repeat-after-me, Read-aloud, Chat, Breathing, and Summary
  screens, with an animated avatar, XP/stars/streaks, and localStorage-persisted progress.
- **Real audio capture:** `useMicRecorder.ts` wraps `MediaRecorder`, preferring
  `audio/webm;codecs=opus` (falls back through ogg/opus and mp4). Emits 250 ms chunks.
- **Live upload:** `audioSocket.ts` streams each chunk over the WebSocket as it is produced, then
  sends an `end` frame and awaits feedback.
- **Feedback UI** (`FeedbackCard.tsx`): child-friendly headline, a 0–100 "smoothness" meter, up to
  two gentle tips, plus a "For grown-ups" disclosure that shows the raw event list
  (type, start–end ms, confidence) for a parent or clinician.

> ✅ **Bottom line:** the experience is real end-to-end; only the speech-analysis brain is mocked.
> Dropping in a real model means replacing one function (`detect_events`) — nothing in the UI,
> transport, or feedback layer needs to change, provided the model honours the contract in §7.

---

## 4. Target MVP architecture

```text
+--------------------------------------------------+
|                Frontend (React)                  |
|  Exercise UI - Mic recording - Playback          |
|  Feedback / correction display - Gamification    |
+-----------------------+--------------------------+
                        |  HTTPS / WSS
                        |  audio chunks + session data
                        v
+--------------------------------------------------+
|                FastAPI backend                   |
|  (modular monolith)                              |
|  Auth - Session/exercise mgmt - Audio validation |
|  Detection orchestration - Feedback layer - API  |
+----------+------------------------+--------------+
           |                        |
           v                        v
+--------------------+   +-----------------------------+
|  PostgreSQL        |   |  Model inference            |
|  users / exercises |   |  (in-process now,           |
|  sessions /        |   |   container later)          |
|  attempts /        |   |  preprocess -> detect ->    |
|  detections /      |   |  events + timestamps +      |
|  feedback_results  |   |  confidence + version       |
+--------------------+   +-----------------------------+
           |
           v
+----------------------------------+
|  Object storage (optional)       |
|  raw/processed audio - temporary |
|  auto-deletion by default        |
+----------------------------------+
```

---

## 5. The attempt lifecycle (per-attempt flow)

```text
1.  Frontend requests / shows an exercise.
2.  User reads or repeats the target phrase.
3.  Frontend records speech via MediaRecorder (webm/opus).
4.  Frontend streams audio chunks over the WebSocket as they arrive.
5.  Backend validates the audio (format, size, duration).
6.  Backend converts it to the model's required format (FFmpeg -> 16 kHz mono PCM WAV).
7.  Detection model analyses the complete recording.
8.  Model returns detected events with timestamps + confidence.
9.  Backend converts events into safe, clinician-approved feedback (rejecting low-confidence results).
10. Frontend displays feedback and lets the user replay the section and retry.
```

---

## 6. Detection vs. feedback — the critical boundary

The model answers one narrow question: *"What speech event was detected, where, and how confident
are you?"* It must never write therapeutic advice or drive the UI directly. The backend's feedback
layer translates raw events into safe, approved wording.

**Model output (raw, internal):**

```json
{
  "model_version": "stutter-detector-0.3.0",
  "audio_duration_ms": 4820,
  "events": [
    { "type": "sound_repetition", "start_ms": 1250, "end_ms": 1810, "confidence": 0.89, "word": "please" }
  ]
}
```

**Backend feedback (user-facing, safe):**

```json
{
  "attempt_id": "att_123",
  "status": "completed",
  "feedback": {
    "message": "Try the sentence again at a comfortable pace.",
    "highlighted_word": "please",
    "exercise_action": "repeat_phrase",
    "playback_start_ms": 1000,
    "playback_end_ms": 2100
  }
}
```

Benefits: the model can be replaced without frontend changes; model accuracy and feedback quality
are tested separately; low-confidence predictions can be rejected; user wording stays
clinician-approved; and every result records which model version produced it.

---

## 7. Model Integration Contract v1 — **FREEZE THIS FIRST**

This is the agreement between the app and the model. The proposal below is aligned with the
categories the app already uses. Review, adjust, and sign off before building further.

### 7.1 Audio input contract (what the model receives)

| Property | Proposed value |
|---|---|
| Container / encoding | WAV / PCM (uncompressed) |
| Channels | Mono |
| Sample rate | 16 kHz |
| Sample width | 16-bit |
| Max duration | 30 seconds |
| Silence trimming | **To decide** — does the model expect leading/trailing silence removed? |
| Expected sentence supplied? | **To decide** — does the model need the target text to align events to words? |

> The browser produces webm/opus (varies by browser). The backend converts to the standard above
> with FFmpeg, so the model always receives a consistent format regardless of the client.

### 7.2 Detection categories (event types)

The app currently models these categories (the `EventType` enum). The model's labels must map onto
this set (or we extend the set together):

| Category | Meaning |
|---|---|
| `fluent` | No dysfluency in this span |
| `repetition` | Sound / syllable / word repetition |
| `prolongation` | A sound held longer than typical |
| `block` | An audible/silent block before a sound |
| `interjection` | Filler insertions (e.g. "um", "uh") |

### 7.3 Model output contract (what the model returns)

```json
{
  "model_version": "stutter-detector-0.3.0",
  "audio_duration_ms": 4820,
  "events": [
    {
      "type": "repetition",
      "start_ms": 1250,
      "end_ms": 1810,
      "confidence": 0.89,
      "word": "please"
    }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `model_version` | string | Stored with every result for auditing/reproducibility. |
| `audio_duration_ms` | int | Model's measured duration of the analysed audio. |
| `events[].type` | enum | From §7.2. |
| `events[].start_ms` / `end_ms` | int | Milliseconds from start; `end_ms >= start_ms`. |
| `events[].confidence` | float 0–1 | Backend rejects events below a configurable threshold. |
| `events[].word` | string? | Optional aligned word/text. |

### 7.4 Error & uncertainty contract

```json
{
  "model_version": "stutter-detector-0.3.0",
  "error": {
    "code": "audio_unintelligible | too_short | internal_error | low_confidence",
    "message": "Human-readable reason"
  }
}
```

On error or overall low confidence, the app shows a safe message such as
*"I couldn't assess this attempt reliably — let's try again."* It never fabricates feedback.

### 7.5 Operational contract

| Item | To agree |
|---|---|
| Average processing time | Target < 1–2 s per 30 s clip (drives whether a job queue is needed). |
| GPU required? | Determines deployment (in-process vs. separate container/service). |
| Concurrency | How many simultaneous inferences the model can handle. |
| Versioning | Semantic version string; bumped on any behaviour change. |
| Invocation | Local Python call first; HTTP endpoint (POST audio, return JSON) when containerised. |

### 7.6 The interface the backend depends on

```python
from typing import Protocol

class StutterDetector(Protocol):
    async def analyse(self, audio_path: str) -> dict:
        ...

# Now: in-process implementation (today this is the stub)
class LocalStutterDetector:
    async def analyse(self, audio_path: str) -> dict:
        return await run_model(audio_path)

# Later: HTTP implementation, same interface
class RemoteStutterDetector:
    async def analyse(self, audio_path: str) -> dict:
        # POST audio to the model container, validate + return JSON
        ...
```

---

## 8. Suggested backend module layout

```text
backend/app/
  main.py
  api/         auth.py  exercises.py  sessions.py  attempts.py
  services/    audio_service.py  inference_service.py
               feedback_service.py  session_service.py
  models/      user.py  exercise.py  session.py  attempt.py
  schemas/     inference.py  feedback.py  attempts.py
  repositories/ session_repository.py  attempt_repository.py
  core/        config.py  security.py  logging.py
```

A modular monolith: one repo, one deployable, with clear internal seams. The current code is a
leaner version of this; it can grow into this shape as features land.

---

## 9. API surface (target)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/auth/login` | Authenticate user |
| GET | `/api/v1/exercises` | List exercises |
| GET | `/api/v1/exercises/{id}` | Get one exercise |
| POST | `/api/v1/sessions` | Start a practice session |
| GET | `/api/v1/sessions/{id}` | Get session |
| POST | `/api/v1/sessions/{id}/attempts` | Submit an attempt (or stream via WS as today) |
| GET | `/api/v1/attempts/{id}` | Get attempt result |
| GET | `/api/v1/users/me/progress` | Progress history |
| DELETE | `/api/v1/attempts/{id}/audio` | Delete stored audio |

> The current build streams attempts over a WebSocket (`/api/attempts/ws`) and returns feedback
> inline, which is fine while inference is fast. Move to submit-then-poll only if inference becomes slow.

---

## 10. Database design (when persistence is added)

```text
users(id, email, created_at, consent_version, consent_given_at)
exercises(id, title, prompt_text, difficulty, exercise_type,
          approved_feedback_rules, version)
sessions(id, user_id, started_at, completed_at, exercise_plan_version)
attempts(id, session_id, exercise_id, status, audio_storage_key,
         audio_duration_ms, created_at, completed_at)
detections(id, attempt_id, event_type, start_ms, end_ms,
           confidence, detected_text, model_version)
feedback_results(id, attempt_id, message_template_id,
                 recommended_action, created_at)
```

> Do **not** reduce progress to a single "stutter score." Keep the underlying attempts and
> detections so any score can later be audited and explained.

---

## 11. Audio storage & privacy

Default policy for the MVP:

```text
receive audio  ->  process  ->  return result  ->  delete raw audio
```

Retain recordings only with explicit consent and a clear reason (e.g. progress review). Speech
recordings and speech-disorder information may be **health information**; in Australia even small
health-service providers can be covered by the Privacy Act, and sensitive information needs stronger
consent and protection.

- HTTPS/WSS in transit; encrypt audio at rest.
- Never log raw recordings.
- Unpredictable IDs; verify every attempt belongs to the authenticated user (object-level authorisation).
- Rate-limit uploads; restrict file size and duration; validate real audio content, not just the extension.
- Provide deletion controls; record consent versions; separate analytics from identifying data.
- Never reuse recordings to retrain the model without separate, explicit consent.

---

## 12. Medical & ethical boundary

Detecting stuttering and prescribing exercises can push software toward a "medical device"
definition. The exact position depends on the claims made. To stay safe:

- Do not market it as diagnosing a disorder unless clinically and legally validated.
- Describe model output as an *indication*, not a confirmed diagnosis.
- Use exercises and feedback reviewed by a qualified speech pathologist.
- Provide an explicit low-confidence response ("I couldn't assess this reliably").
- Do not let a general-purpose LLM invent therapeutic exercises.
- Support clinician review for uncertain or concerning results.
- Test across accents, ages, genders, languages, microphones, and noise conditions.

---

## 13. Roadmap / when to add complexity

| Add | Trigger |
|---|---|
| PostgreSQL + SQLAlchemy | Need persistent users, sessions, and progress history. |
| Authentication (JWT / managed) | Before any real user data or multi-user deployment. |
| FFmpeg conversion | As soon as the real model needs a fixed 16 kHz mono WAV input. |
| Redis + worker (Celery/Dramatiq/RQ) | Inference > a few seconds, concurrent submissions, retries, or limited-GPU concurrency. |
| Separate model container (`RemoteStutterDetector`) | Model needs a GPU or independent scaling/deployment. |
| True live feedback | Only after upload-based per-attempt feedback is solid; analyse on pause/phrase boundaries, not every chunk. |
| Clinician dashboard | When clinician supervision/review is part of the offering. |

---

## 14. Open questions to resolve together

- Who is the target user, and is v1 for practice, screening, or treatment? (Affects regulatory posture.)
- Does the model need the expected sentence text, and does it expect silence trimmed? (§7.1)
- What is the confidence threshold below which we reject an event?
- Does the model require a GPU, and what is its average latency? (Decides queue + deployment.)
- Is raw audio stored at all in v1, and for how long?
- Which dysfluency types does v1 actually support reliably? (May narrow §7.2 for launch.)

---

## 15. Next steps & ownership

| Owner | Next action |
|---|---|
| Both | Review and freeze the Model Integration Contract (§7). |
| ML collaborator | Confirm input format, supported categories, output JSON, latency, and GPU needs. |
| App developer | Add the `StutterDetector` protocol + a `RemoteStutterDetector` shim; add FFmpeg conversion once input format is fixed. |
| App developer | Replace the `detect_events()` stub with a call through the protocol. |
| Both | Decide persistence + consent model before any real-user testing. |

---

*End of document. Comments welcome inline.*
