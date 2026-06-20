# LanguageAI 🗣️

A friendly **talking human avatar** (Talking-Tom style): type a message and a
cartoon avatar speaks the reply back to you, lip-syncing and emoting as it talks.

Built with the **fullstack-guardian** skill (three-perspective: Frontend / Backend
/ Security). This is the initial scaffold with a **dummy** backend — the avatar's
replies are canned for now and meant to be swapped for a real model later.

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
├── frontend/     React avatar app   (see frontend/README.md)
├── specs/        Three-perspective design doc
└── README.md
```

## Roadmap

- [x] Replace the dummy reply generator with a real LLM (Claude via the Anthropic SDK).
      Opt-in: set `LANGUAGEAI_ANTHROPIC_API_KEY` (or `ANTHROPIC_API_KEY`) and the
      `/api/chat` endpoint uses `claude-opus-4-8` with structured `{reply, mood}`
      output; with no key it falls back to the dummy generator.
- [ ] Server-side TTS with viseme timing for tighter lip-sync.
- [ ] Auth, rate limiting, and conversation history.
- [ ] Richer avatar art + more expressions.

## Skills used

Installed from [Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills):
`fullstack-guardian` (lead), `fastapi-expert`, `react-expert`, plus `test-master`
and `typescript-pro`.
