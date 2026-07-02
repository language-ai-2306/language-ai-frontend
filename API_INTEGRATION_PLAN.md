# LanguageAI — Frontend ↔ Backend API Integration Plan

> **Purpose:** a hand-off plan for wiring the React frontend (`frontend/`) to the
> real FastAPI backend documented in [`backendInitialPrompt`](./backendInitialPrompt)
> (Swagger: **Language AI — Backend API v1.0.0**).
>
> **How to use this doc:** this is a _proposal_ written from reading the API doc +
> the current frontend. **Edit it directly** — correct anything wrong, fill in the
> ⚠️ open questions, and tick the checklist as you go. Nothing here is set in stone.
>
> **Author's note:** auth + game logic in the frontend is currently **mocked**.
> The old `src/api/client.ts` / `src/api/audioSocket.ts` target a _different_,
> older backend (`/api/chat`, WebSocket `/api/attempts/ws`) that **does not exist**
> in this API. Treat them as reference only — most of the work is a rewrite of the
> API layer, not an edit.

---

## 0. TL;DR — recommended order of work

1. **Config & API base URL** (§1) — point the app at the backend.
2. **Auth foundation** (§2) — token storage + a `fetch` wrapper that injects
   `Authorization: Bearer <token>`. Everything else depends on this.
3. **Onboarding/signup + login** (§4a–4c) — the flow that already exists in the UI.
4. **Proficiency test** (§4d) — the post-signup "quick check" (`AssessmentScreen`).
5. **Game data + audio analysis** (§4e–4h) — repeat-after-me, conversation, audio.
6. **Doctor / desktop-only endpoints** (§4i) — mostly out of scope for mobile.

Do §1 + §2 first and end-to-end (log in a seeded user, hit `/auth/me`) before
touching any feature screen.

---

## 1. Config & environment

| Concern | Current state | Action |
|---|---|---|
| API base URL | `client.ts` uses `import.meta.env.VITE_API_BASE_URL ?? ''` | Set `VITE_API_BASE_URL` (e.g. `http://localhost:8000`) in `frontend/.env.local`. |
| Dev proxy | `vite.config.ts` proxies **`/api`** → `http://localhost:8000` | Backend paths are `/auth`, `/users`, `/v1/...` — **not** under `/api`. Either (a) set `VITE_API_BASE_URL` and call absolute paths, or (b) add proxy entries for `/auth`, `/users`, `/phrases`, `/game`, `/proficiency-test`, `/v1`. **Recommend (a)** for clarity. |
| CORS | — | If using (a) with a cross-origin base, backend must allow the frontend origin. |

**Files:** `frontend/.env.local` (new), `frontend/vite.config.ts`.

---

## 2. Auth foundation (do this first)

### 2.1 Token storage
- Add `authToken: string | null` and `currentUser: UserRead | null` to `AppState`
  in `frontend/src/store/AppStore.tsx`. Persist `authToken` (it already persists a
  slice to `localStorage`; add the token to `Persisted` + the `toSave` object + the
  effect deps).
- On app boot, if a token exists, call `GET /auth/me` to rehydrate `currentUser`
  (and log out on 401).

### 2.2 API client rewrite — `frontend/src/api/client.ts`
- Keep the `ApiError` + `request<T>()` shape, but:
  - Inject `Authorization: Bearer <token>` when a token is set. (Read the token from
    the store, or pass it in — see §6 Q6.)
  - On `401`, clear the token and route to `login`.
- **`POST /auth/login` is `application/x-www-form-urlencoded`** (OAuth2 password
  flow — schema `Body_login_auth_login_post`), **not JSON**:
  - Body: `username=<email>`, `password=<pw>`, `grant_type=password`.
  - Returns `Token { access_token, token_type }`.
  - ⚠️ `username` = the user's **email**.
- `POST /auth/signup` and everything else are JSON.

### 2.3 New typed modules (suggested)
Split the giant surface into small files under `frontend/src/api/`:
`auth.ts`, `users.ts`, `phrases.ts`, `game.ts`, `proficiency.ts`, `conversation.ts`,
`repeatAfterMe.ts`, `audio.ts`, `admin.ts`. Mirror the Swagger schemas as TS types in
`frontend/src/types/api.ts` (see §5). The current `src/types/index.ts`
(`ChatRequest`, `AttemptFeedback`, …) describes the **old** backend — supersede it.

---

## 3. Endpoint → frontend map (the core of this doc)

Legend: **P** = patient app (mobile, this repo), **D** = doctor/desktop portal
(likely a different surface — see §4i).

| Backend endpoint | Method | Where it goes in the frontend | Notes |
|---|---|---|---|
| `/auth/signup` | POST | `SignUpScreen.tsx` (+ `ProfileSetupScreen` / `TherapistSetupScreen`) | ⚠️ Schema wants data collected across several screens — see §4a. |
| `/auth/login` | POST | `LoginScreen.tsx` | Form-encoded. §2.2. |
| `/auth/me` | GET | `AppStore` boot + `HomeScreen` | Rehydrate user/role. |
| `/users` | GET | **D** | Doctor-only list. |
| `/users/{id}` | GET/PATCH/DELETE | `ProfileSetupScreen` (PATCH self), Settings, **D** | PATCH for editing own profile. |
| `/phrases` (+ `/{id}`) | CRUD | **D** | Doctor-managed content. Not in patient UI. |
| `/game/phrases` | GET | `CompanionScreen` (repeat), practice screens | Batch of unseen phrases for current level. |
| `/game/targeted-phrases` | GET | Practice / adaptive session | Personalised batch (`reason` per phrase). |
| `/proficiency-test/start` | POST | `AssessmentScreen.tsx` | Returns `test_id` + 40 phrases. §4d. |
| `/proficiency-test/{id}/submit` | POST | `AssessmentScreen.tsx` | Returns `assigned_difficulty`. §4d. |
| `/v1/audio/defaults` | GET | Audio setup | Default reference phrase / child age. |
| `/v1/audio/analyze` | POST (multipart) | `ReadAloudScreen` / any raw-recording analysis | Stateless, no DB. §4h. |
| `/v1/audio/patients/{id}/practice-skill` | GET | Progress UI (**P**/**D**) | Per-sound mastery matrix. |
| `/v1/conversation/session/start` | POST | `CompanionScreen` (converse mode) | Ollie greets first; returns `audio`. §4g. |
| `/v1/conversation/session/{id}/reply` | POST (multipart) | `CompanionScreen` (converse mode) | Upload child audio → AI reply + `audio`. §4g. |
| `/v1/conversation/session/{id}/end` | POST | `CompanionScreen` end / `SummaryScreen` | Disfluency breakdown. |
| `/v1/conversation/session` (+ `/{id}`) | GET | History / `SummaryScreen`, **D** | Session list / full report. |
| `/v1/conversation/patients/{id}/progress` | GET | Progress charts (**D**, maybe **P**) | Trend across sessions. |
| `/v1/conversation/patients/{id}/disfluency-profile` | GET | Progress (**D**) | Top problem sounds/types/words. |
| `/v1/admin/config` (+ `/{key}`) | GET/PUT | **D** | Doctor-only runtime config. |
| `/v1/repeat-after-me/start` | GET | `QuickStartScreen` / `RepeatAfterMeScreen` | AI spoken intro by name (`text` + `audio`). §4f. |
| `/v1/repeat-after-me/next-phrase` | GET | Repeat game (`CompanionScreen` repeat mode) | Next phrase + AI-voiced `audio`. §4f. |
| `/v1/repeat-after-me/attempt` | POST (multipart) | Repeat game — replaces mock in `usePracticeSession` | Analyse attempt + store. §4f. |
| `/health` | GET | (optional) startup check | — |

---

## 4. Flow-by-flow wiring

### 4a. Signup / onboarding ⚠️ (biggest design decision)

**Problem:** the signup schemas want everything up front, but the UI gathers it
across several screens:

- `PatientSignup` requires: `email, first_name, last_name, dob, gender, password,
  role="PATIENT", nickname` + optional `avatar_id`, `ailment_ids[]`.
  - `email, names, dob, gender, phone, password` → **`SignUpScreen`** (Patient tab).
  - `nickname, avatar_id` → **`ProfileSetupScreen`** (collected _after_ signup today).
  - `ailment_ids[]` → **not collected anywhere yet** (see §6 Q2).
- `DoctorSignup` requires: same identity fields + `role="DOCTOR"`, `qualification,
  bio` + optional `address, photo_url`.
  - identity → **`SignUpScreen`** (Therapist tab).
  - `qualification, bio, address, photo_url` → **`TherapistSetupScreen`**.

**Recommended approach — defer the real `POST /auth/signup` to the end of onboarding:**
1. `SignUpScreen` collects identity + password and stores it in the store (do **not**
   call the API here yet — today it just navigates).
2. Patient: `ProfileSetupScreen` "Continue to Dashboard" builds the full
   `PatientSignup` body (identity + nickname + avatar_id + ailment_ids) → `POST
   /auth/signup` → then `POST /auth/login` to get a token → `GET /auth/me` → `home`.
3. Therapist: `TherapistSetupScreen` "Complete Setup" builds the full `DoctorSignup`
   body → `POST /auth/signup` → login → `OnboardingCompleteScreen`.

> Alternative: signup minimally, then `PATCH /users/{id}` for the rest. Rejected
> because `nickname` is **required** on `PatientSignup`, so you can't create a valid
> patient before profile setup anyway. Confirm with backend (§6 Q1).

**Files:** `SignUpScreen.tsx`, `ProfileSetupScreen.tsx`, `TherapistSetupScreen.tsx`,
`AppStore.tsx` (a `signupDraft` slice), `api/auth.ts`.

### 4b. Login
- `LoginScreen.tsx` `submit()` → `POST /auth/login` (form-encoded, §2.2) → store token
  → `GET /auth/me` → route by `role` + `profileComplete`:
  - `PATIENT` & first login → `profileSetup`; else `home`.
  - `DOCTOR` → therapist flow / desktop notice.
- Replace the current mock `navigate(state.profileComplete ? 'home' : 'profileSetup')`.

### 4c. Email / guardian verification ⚠️
- **There is no verification endpoint in the API.** `VerifyEmailScreen.tsx` is
  currently UI-only (a "Resend" button + a demo "continue" link).
- Decision needed (§6 Q3): does the backend gate login until verified?
  - If **no** gate → keep the screen as an informational step; proceed after signup.
  - If **yes** → you'll need a backend endpoint (`/auth/verify`, resend, status) that
    doesn't exist yet — coordinate with backend before wiring.

### 4d. Proficiency test → `AssessmentScreen.tsx`
- Today: a mocked 5-minute "quick check". Replace with:
  1. `POST /proficiency-test/start` → `{ test_id, phrases[] }` (up to 40).
  2. For each phrase: show sentence, record audio, score locally or per-phrase.
  3. `POST /proficiency-test/{test_id}/submit` with `{ responses: [{phrase_id, score,
     is_correct, disfluencies}] }` → `ProficiencyResult { assigned_difficulty }`.
- Map `assigned_difficulty` (EASY/MEDIUM/HARD/TONGUE_TWISTER) → store
  `gameDifficulty` + `assessment`. See enum mapping §5.
- ⚠️ Per-phrase `score`/`disfluencies` likely come from `/v1/audio/analyze` — decide
  whether the assessment analyses each phrase via audio, or just records correctness
  (§6 Q4).

### 4e. Game phrases
- `GET /game/phrases` and `GET /game/targeted-phrases` feed the practice batch.
- Consumers: `CompanionScreen` (repeat mode) and any list-based practice. The current
  hardcoded `PHRASES` array in `companion/data.ts` / `usePracticeSession.ts` is the
  thing being replaced.

### 4f. Repeat-After-Me → `RepeatAfterMeScreen` + `CompanionScreen` (repeat) + `usePracticeSession`
- `GET /v1/repeat-after-me/start` → AI intro `{ text, audio }` (play on entry;
  `QuickStartScreen`/game start).
- `GET /v1/repeat-after-me/next-phrase` → `{ phrase, reason, audio }`. Play `audio`
  (AI voice) + drive lipsync (see §4-audio playback).
- `POST /v1/repeat-after-me/attempt` (**multipart**: `audio` file + `text` + optional
  `use_mock`) → analysis result. **This replaces the mocked `endListening()` in
  `usePracticeSession.ts`** (currently a `setTimeout` + `Math.random()`).
- Recording comes from `companion/hooks/useMicrophoneRecorder.ts`.

### 4g. Conversation ("Talk with Ollie") → `CompanionScreen` (converse mode)
- `POST /v1/conversation/session/start` → `{ session_id, turn_number, text, audio }`
  (Ollie greets; play `audio`).
- Per turn: `POST /v1/conversation/session/{session_id}/reply` (**multipart** `audio`)
  → `TurnResponse { child_transcript, text, audio, disfluencies[] }`. Play `audio`,
  render transcript, feed disfluencies to feedback UI.
- `POST /v1/conversation/session/{session_id}/end` → `SessionEndResponse`
  (breakdown) → `SummaryScreen`.
- History: `GET /v1/conversation/session` (list) + `/{id}` (full report).

### 4h. Audio analysis → replaces `src/api/audioSocket.ts`
- **The current WebSocket pipeline (`/api/attempts/ws`) does not exist.** All audio
  now goes over **multipart POST**:
  - `POST /v1/audio/analyze` — stateless: `audio` file + `reference_phrase` +
    `child_age` + `use_mock`. Use for `ReadAloudScreen` / one-off analysis.
  - `POST /v1/repeat-after-me/attempt` — practice attempts (§4f).
  - `POST /v1/conversation/.../reply` — conversation turns (§4g).
- **Recording:** keep `useMicrophoneRecorder` (MediaRecorder), but instead of
  streaming chunks over WS, assemble the final `Blob` and POST it as `FormData`.
  Backend accepts **WAV / M4A** (Swagger says WAV/M4A; MediaRecorder usually emits
  `audio/webm`) — ⚠️ confirm accepted formats / add conversion (§6 Q5).
- **AI voice playback:** responses carry an `audio` string. ⚠️ confirm whether it's a
  base64 payload or a URL (§6 Q7), then play it and drive the existing lipsync
  (`companion/lipsync/`) the way the Typecast pipeline currently does.

### 4i. Doctor / desktop-only endpoints
Per `OnboardingCompleteScreen` ("visit the LanguageAI portal on your desktop"),
these are likely a **separate web surface**, not this mobile app:
`/users` (list), `/phrases` CRUD, `/v1/admin/config`,
`/v1/conversation/patients/{id}/progress` & `/disfluency-profile`,
`/v1/audio/patients/{id}/practice-skill`. Confirm scope (§6 Q8) — if any belong in
this app (e.g. a patient viewing their own progress), wire read-only versions.

---

## 5. Data model mapping (frontend ↔ backend)

| Frontend | Backend | Mapping / action |
|---|---|---|
| `GameDifficulty` `'easy'\|'medium'\|'hard'\|'twister'` | `Difficulty` `EASY\|MEDIUM\|HARD\|TONGUE_TWISTER` | Upper-case; `twister ↔ TONGUE_TWISTER`. Add a converter. |
| `ProfileSetupScreen` avatar ids (`'lion'`, `'owl'`, …, strings) | `avatar_id: integer` | ⚠️ Need a **string↔int** avatar map agreed with backend (§6 Q9). |
| (not collected) | `ailment_ids: integer[]` | ⚠️ No UI collects these (§6 Q2). Default `[]`? Add a picker? |
| `state.name` (nickname) | `nickname` (PatientSignup) | Direct. |
| `state.hasDoctor` (therapist-connection Yes/No) | — | No matching field in signup schema — decide if/where it maps (§6 Q10). |
| `state.assessment` / `gameDifficulty` | `assigned_difficulty` | Set from proficiency submit. |
| `AttemptFeedback`/`DetectedEvent` (old types) | `DisfluencyEventOut`, `TurnResponse`, analysis result | Replace old types with Swagger-mirrored types in `types/api.ts`. |

---

## 6. Open questions for the backend / PM ⚠️ (fill these in)

1. **Q1 – Signup timing:** OK to defer `POST /auth/signup` until end of onboarding
   (§4a)? Or should we create the account at the first screen and PATCH later?
2. **Q2 – `ailment_ids`:** where do patients pick their disfluency ailments? Is there
   an ailments list endpoint (none is documented)? Default to `[]` for MVP?
3. **Q3 – Email/guardian verification:** does the backend block login until verified?
   Is there a verify/resend endpoint coming? (None documented.)
4. **Q4 – Proficiency scoring:** does the client compute per-phrase `score`/
   `is_correct`/`disfluencies`, or call `/v1/audio/analyze` per phrase?
5. **Q5 – Audio format:** exact accepted upload formats (WAV/M4A only, or webm/ogg)?
   Do we need client-side transcoding from MediaRecorder's `audio/webm`?
6. **Q6 – Token access in `client.ts`:** read token from the store singleton, from
   `localStorage`, or pass per-call? (Affects the client's shape.)
7. **Q7 – `audio` response field:** base64 data URI or a fetchable URL? Same for
   `child_audio_url`.
8. **Q8 – Doctor endpoints scope:** which (if any) belong in this mobile app vs the
   desktop portal?
9. **Q9 – Avatar mapping:** the canonical `avatar_id` integers for each mascot.
10. **Q10 – "Seeing a therapist?" (`hasDoctor`):** does this map to a backend field /
    linking flow, or is it UI-only for now?

---

## 7. Suggested new file structure

```
frontend/src/
  api/
    client.ts        # rewrite: base URL + Bearer injection + 401 handling
    auth.ts          # signup, login (form-encoded), me
    users.ts         # get/patch/delete
    game.ts          # phrases, targeted-phrases
    proficiency.ts   # start, submit
    conversation.ts  # start, reply(multipart), end, list, report, progress
    repeatAfterMe.ts # start, next-phrase, attempt(multipart)
    audio.ts         # defaults, analyze(multipart), practice-skill
    admin.ts         # (doctor) config
    audioSocket.ts   # DELETE — obsolete WebSocket pipeline
  types/
    api.ts           # types mirroring Swagger schemas (supersede index.ts)
  store/
    AppStore.tsx     # + authToken, currentUser, signupDraft; persist token
```

---

## 8. Integration checklist

- [ ] `.env.local` + base URL / proxy configured (§1)
- [ ] Token stored + persisted; `client.ts` injects Bearer; 401 → logout (§2)
- [ ] `GET /auth/me` rehydrate on boot
- [ ] Login wired (form-encoded) (§4b)
- [ ] Patient signup wired end-to-end (§4a)
- [ ] Therapist signup wired end-to-end (§4a)
- [ ] Verification decision resolved (§4c / Q3)
- [ ] Proficiency test wired (`AssessmentScreen`) (§4d)
- [ ] Game phrases wired (§4e)
- [ ] Repeat-after-me: start / next / attempt (§4f)
- [ ] Conversation: start / reply / end + playback (§4g)
- [ ] Audio analyze (multipart) replaces WebSocket (§4h)
- [ ] Old `client.ts` `sendChat` / `audioSocket.ts` / old `types/index.ts` removed
- [ ] Difficulty + avatar mappings implemented (§5)
- [ ] All ⚠️ open questions (§6) answered

---

_Generated as a starting point from `backendInitialPrompt`. Edit freely._
