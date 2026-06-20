# LanguageAI 🗣️

A bright, **gamified speech-practice app** for mixed ages — including children —
designed for people who **stutter**. A friendly avatar models words, the user
practices by voice, and effort is always rewarded with stars (there are **no
"wrong" answers** and no anxiety-inducing timers).

**Activities:** Repeat-after-me · Read-aloud · Free chat · Breathing & pacing.
**Gamification:** XP, levels, stars, day streaks, and a session summary for a
parent or therapist.

Design principles baked in: self-paced (no countdowns), encouraging-only
feedback, large/clear targets, `prefers-reduced-motion` support — and exercises
**record the user's real audio** (`MediaRecorder`) rather than grading a
transcript, so stutters are captured, never penalised. That audio is the seam
for the planned backend AI analysis (`submitAttempt` in `frontend/src/api/client.ts`).

Built with the **fullstack-guardian** (lead), **react-expert** (UI rework),
**fastapi-expert**, and **claude-api** skills.

```
┌────────────┐   POST /api/chat    ┌──────────────────────┐
│  React UI  │ ──────────────────► │  FastAPI (dummy)     │
│  + Avatar  │ ◄────────────────── │  reply + mood        │
└────────────┘   { reply, mood }   └──────────────────────┘
      │
      └─ speechSynthesis speaks the reply → avatar lip-syncs + emotes
```

## Stack

| Layer    | Tech                                              |
|----------|---------------------------------------------------|
| Frontend | React 18 · TypeScript (strict) · Vite             |
| Backend  | FastAPI · Pydantic v2 · Uvicorn (dummy, stateless)|
| Speech   | Browser Web Speech API (no audio backend needed)  |

## Quick start

Two terminals:

```bash
# 1) Backend  →  http://localhost:8000  (docs at /docs)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2) Frontend →  http://localhost:5173
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, type a message, and watch the avatar talk back.

## Layout

```
LanguageAI/
├── backend/      FastAPI dummy API  (see backend/README.md)
├── frontend/     React app: gamified screens (Home, Repeat, Read, Chat, Breathe)
│                 + store/ (XP/stars/streak), hooks (speech, mic recorder)
├── specs/        Three-perspective design doc
└── README.md
```

## Roadmap

- [x] Replace the dummy reply generator with a real LLM (Claude via the Anthropic SDK).
      Opt-in: set `LANGUAGEAI_ANTHROPIC_API_KEY` (or `ANTHROPIC_API_KEY`) and the
      `/api/chat` endpoint uses `claude-opus-4-8` with structured `{reply, mood}`
      output; with no key it falls back to the dummy generator.
- [ ] **Backend audio-analysis endpoint** — accept recorded attempts (`submitAttempt`
      seam already in place), run AI analysis, and return spoken audio feedback.
- [ ] Server-side TTS with viseme timing for tighter lip-sync.
- [ ] Therapist accounts: save sessions, assign word lists, view trends over time.
- [ ] Richer avatar art + more expressions.

## Skills used

Installed from [Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills):
`fullstack-guardian` (lead), `fastapi-expert`, `react-expert`, plus `test-master`
and `typescript-pro`.
