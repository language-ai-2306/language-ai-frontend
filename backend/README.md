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

| Method | Path          | Body                | Response                              |
|--------|---------------|---------------------|---------------------------------------|
| GET    | `/api/health` | —                   | `{ status, version }`                 |
| POST   | `/api/chat`   | `{ message: str }`  | `{ reply, mood, word_count }`         |

`mood` is one of `neutral · happy · excited · thinking · sad` and drives the
avatar's facial expression on the frontend.
