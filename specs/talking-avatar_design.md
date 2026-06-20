# Feature: Talking Human Avatar (Talking-Tom style)

> Three-perspective design produced via the **fullstack-guardian** skill workflow.
> Status: initial project structure (dummy backend).

## Requirements (EARS Format)

- While the app is loaded, when the user types a message and hits send, the system
  shall request a reply from the backend and have the avatar speak it aloud.
- While the avatar is speaking, when audio is playing, the system shall animate the
  avatar's mouth (lip-sync) and reflect the reply's mood in its expression.
- While the backend is unreachable, when a request fails, the system shall surface a
  friendly error and return the avatar to its idle state.

## Architecture

- **Frontend:** React 18 + TypeScript (strict) + Vite.
  - `Avatar` — animated SVG humanoid (blink, emote, lip-sync via mouth-open amplitude).
  - `ChatBar` — text input + send, client-side validation, disabled while speaking.
  - `useChat` — calls the API, tracks loading/error.
  - `useSpeech` — wraps the browser `speechSynthesis` API; exposes `isSpeaking` and a
    `mouthOpen` (0..1) value driven by a requestAnimationFrame loop for lip-sync.
  - `ErrorBoundary` — graceful failure surface.
- **Backend (dummy):** FastAPI + Pydantic v2, async endpoints.
  - `POST /api/chat` — echoes a canned, personality-flavored reply with a `mood`.
  - `GET  /api/health` — liveness probe.
  - CORS restricted to the configured frontend origins.
- **Security:** input validation both sides, response schema filtering, payload size
  caps, restrictive CORS, no secrets in code. (Auth is out of scope for the dummy.)

### Data flow

```
User types → ChatBar (validate) → useChat → POST /api/chat
  → FastAPI validates (Pydantic) → builds dummy reply + mood
  → JSON response → useSpeech speaks reply → Avatar lip-syncs + emotes → idle
```

## Three-Perspective Breakdown

### [Frontend]
- Components: `Avatar`, `ChatBar`, `ErrorBoundary`.
- Client-side validation: non-empty, max length, trim.
- States: `idle | listening | thinking | talking` + mood-driven expression.
- Loading state while awaiting the reply; disable input while the avatar talks.
- Accessibility: labeled input, `aria-live` status region, keyboard submit, reduced-motion respected.

### [Backend]
- `POST /api/chat` — request `{ message: str }`, response `{ reply, mood, word_count }`.
- `GET /api/health` — `{ status: "ok" }`.
- Pydantic v2 schemas with length bounds; mood chosen deterministically from the input.
- No database yet (dummy in-memory reply generation in `dummy_data.py`).

### [Security]
- Input: `message` bounded (1..500 chars), whitespace-stripped, validated by Pydantic.
- Output: explicit response schema — no internal fields leak.
- CORS: only the configured dev origins; methods limited to what's used.
- Rate limiting + auth: deferred (noted in `references` of fullstack-guardian); the
  dummy endpoint is read-only and stateless so the attack surface is minimal.
- No hardcoded secrets; config via environment (`pydantic-settings`).

## Implementation Plan

- [x] Step 1: Pydantic schemas (`ChatRequest`, `ChatResponse`, `HealthResponse`)
- [x] Step 2: Dummy reply generator (`dummy_data.py`)
- [x] Step 3: Routers (`chat`, `health`) + app wiring + CORS
- [x] Step 4: React avatar, hooks, chat bar, API client
- [x] Step 5: Tests (backend pytest) + run instructions

## Future work (post-scaffold)

- Replace dummy reply with a real LLM call (Claude via the Anthropic SDK).
- Server-side TTS with viseme timing for tighter lip-sync.
- Auth + rate limiting + conversation history persistence.
