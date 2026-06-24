# LanguageAI — Backend (dummy FastAPI)

Stateless dummy API that returns a canned reply + mood for the avatar to speak.
Replace `app/dummy_data.py` with a real LLM call later.

## Run

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                 # optional
uvicorn app.main:app --reload --port 8000
```

- Interactive docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

## Test

```bash
pytest
```

## Endpoints

| Method | Path                 | Body / Protocol     | Response                              |
|--------|----------------------|---------------------|---------------------------------------|
| GET    | `/api/health`        | —                   | `{ status, version }`                 |
| POST   | `/api/chat`          | `{ message: str }`  | `{ reply, mood, word_count }`         |
| WS     | `/api/attempts/ws`   | streamed audio      | `{ ...AttemptFeedback }`              |

`mood` is one of `neutral · happy · excited · thinking · sad` and drives the
avatar's facial expression on the frontend.

## Practice-attempt analysis (WebSocket)

`/api/attempts/ws` is how the frontend turns one spoken practice attempt into
feedback. The browser records the mic with `MediaRecorder` and streams the audio
chunks over a single WebSocket *while the user is still speaking*, so when they
stop only the tail remains to upload. Frames:

```
client → {"type":"start","exercise":str,"target":str|null,"mime":str}
client → <binary audio chunk>            (repeated as recorded)
client → {"type":"end","durationMs":int}
server → {"type":"status","status":"analyzing"}
server → {"type":"feedback", ...AttemptFeedback}   # or {"type":"error","detail":str}
```

Each completed clip is written to `LANGUAGEAI_AUDIO_STORAGE_DIR`
(default `data/attempts/`, git-ignored) with a `.json` metadata sidecar — the
input seam for the future detection model.

### The analysis pipeline (`app/analysis.py`)

The handler runs four swappable stages that map to the product workflow:

1. **validate** — reject empty / oversized / unknown-format clips.
2. **convert** (`to_model_input`) — transcode to the model's format. *Currently a
   pass-through stub* — wire `ffmpeg` (→ 16 kHz mono WAV) when the model is chosen.
3. **detect** (`detect_events`) — **the model SEAM**. Currently a *deterministic
   stub* that fabricates plausible events from a hash of the audio so the whole
   flow runs end-to-end; it does **not** analyse speech. Replace its body with a
   real inference call.
4. **feedback** (`build_feedback`) — convert raw events into safe, encouraging,
   non-clinical copy (`headline · detail · tips · smoothness · events`).

Origin is checked against `LANGUAGEAI_CORS_ORIGINS` (WebSockets bypass CORS).

## Real replies (optional)

By default `/api/chat` uses a deterministic dummy generator. To use Claude
instead, set an API key — the endpoint then calls `claude-opus-4-8` with
structured outputs (`{reply, mood}`) and falls back to the dummy on any error:

```bash
export LANGUAGEAI_ANTHROPIC_API_KEY=sk-ant-...   # or ANTHROPIC_API_KEY
# optional: export LANGUAGEAI_ANTHROPIC_MODEL=claude-opus-4-8
```

See `app/llm.py`.
