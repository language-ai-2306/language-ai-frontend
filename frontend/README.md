# LanguageAI — Frontend (React + TypeScript + Vite)

An animated SVG humanoid avatar that **speaks replies aloud and lip-syncs** to
them (Talking-Tom style). Speech uses the browser's Web Speech API, so no audio
backend is required.

## Run

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The dev server proxies `/api` → `http://localhost:8000` (the FastAPI backend), so
start the backend too. Override the proxy target with `VITE_API_PROXY`, or point
at a deployed API with `VITE_API_BASE_URL` in `.env.local`.

## Scripts

| Script              | Purpose                          |
|---------------------|----------------------------------|
| `npm run dev`       | Start the dev server             |
| `npm run build`     | Type-check + production build    |
| `npm run preview`   | Preview the production build     |
| `npm run typecheck` | `tsc --noEmit`                   |

## Structure

```
src/
├── api/client.ts            # fetch wrapper + ApiError
├── components/
│   ├── Avatar/              # animated SVG avatar (blink, emote, lip-sync)
│   ├── ChatBar/             # validated message input
│   └── ErrorBoundary.tsx
├── hooks/
│   ├── useSpeech.ts         # speechSynthesis + mouthOpen lip-sync driver
│   └── useChat.ts           # API call + loading/error state
├── types/index.ts           # mirrors the backend contract
├── App.tsx                  # composition + mood→voice mapping
└── main.tsx
```

### How lip-sync works

`useSpeech` plays the reply with `speechSynthesis` and runs a
`requestAnimationFrame` loop that produces a `mouthOpen` value (0..1). The
`Avatar` maps that to the height of an open-mouth ellipse, with a small "pop" on
each word boundary — giving a cartoonish talking motion without any backend audio.
Respects `prefers-reduced-motion`.
