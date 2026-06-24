# 🚀 Language AI — Complete Business Overview

---

## 🧠 Core Idea

A voice-first AI platform helping people with speech impediments practice speaking in a safe, low-pressure environment with real-time personalised feedback. Positioned as a companion to speech therapy, not a replacement.

---

## 🎯 Problem

- Limited therapy time → progress depends on practice outside sessions
- No safe practice space → users feel judged or anxious
- Lack of personalised tools → existing apps don't handle disfluencies well
- No objective tracking → hard to measure improvement over time

---

## 👥 Target Users (Priority Order)

1. **Primary (Sprint scope):** Children aged 5–14 who stutter
2. **Secondary:** Parents and speech pathologists (as referrers and partners)
3. **Long-term:** Adults with speech impediments, non-native speakers, job seekers, professionals needing public speaking/interview prep

---

## 💎 Value Proposition

> *"An AI that understands how you speak — and helps you speak better."*

**Differentiators:**
- Focus on speech impediments (not generic language learning)
- Real-time feedback + emotional safety
- Cartoon AI avatar companion (kid-friendly, non-intimidating)
- Therapist-personalised plans built within the app for each patient
- Adaptive AI model that learns and grows with each child over time
- Progress tracking with measurable metrics
- Built to complement therapists, not replace them

---

## ⚙️ Product Features

### Sprint MVP (Current Build)
- Cartoon AI avatar companion
- Stutter detection (repetitions, prolongations, blocks, interjections/fillers, revisions)
- Therapist-personalised practice plans created within the app
- AI model that adapts and learns each child's speech patterns over time
- Progress tracking dashboard (fluency score, confidence score, clarity score)
- 100 clinically-designed phrases (placeholder phrases built, clinically-validated phrases pending professor review)

### 12-Month Vision (Full Product)
- Language Teacher
- Stutter + Lisp helper
- Accent-aware understanding across vocabularies
- Profession-specific coaching (medicine, law, business)
- Level-testing + personalised learning pathways
- Session recommendations by skill (Grammar, Vocabulary, Pronunciation)
- Public speaking events with AI moderator
- Bi-directional interview simulation (trains both interviewer and interviewee)
- Non-native speaker support
- Adult modules

---

## 📊 Key Metrics Tracked

| Metric | Description |
|--------|-------------|
| Fluency Score | 0–100 overall fluency rating |
| Confidence Score | 0–100 confidence rating |
| Clarity Score | 0–100 clarity rating |
| Words Per Minute (WPM) | Speaking rate |
| Average Pause Duration | Mean silence between words |
| Stutter Frequency (%) | Disfluent words as % of total |
| Repetition Count | Number of repeated words/syllables |

> **Moat:** Proving measurable improvement over time through objective data.

---

## 🧩 System Architecture

### ML Pipeline
- **Input:** Child speaks one of 100 known phrases
- **STT:** faster-whisper (word-level timestamps)
- **Detection:** Rule-based comparison against known reference phrase
- **Disfluency Types Detected:** Repetitions, Prolongations, Blocks, Interjections/Fillers, Revisions
- **Scoring:** Fluency/Confidence/Clarity scores calculated
- **Feedback:** Kid-friendly, encouraging feedback generated per disfluency
- **Output:** Scores + feedback returned to backend

### Backend
- Python FastAPI
- PostgreSQL (SQLAlchemy + Alembic)
- AWS S3 (audio storage)
- REST API consumed by frontend and ML service

### Frontend (Not Yet Built)
- React
- Cartoon AI avatar UI
- Dashboard for children, parents, and therapists

> **Performance target:** Sub-300ms response time

---

## 👨‍💻 Team

| Person | Role | Background |
|--------|------|------------|
| Rahul | Founder, AI Engineer | Full-stack + AI/ML, production systems at scale ($100M+ payment infrastructure), 4+ years industry experience |
| Ananya | AI Engineer | LLM/conversational layer, feedback generation, AI expertise across multiple projects, Master of AI at Monash, starting research at Monash next semester |
| Somnath Roy | Frontend + Data Science | 5+ years professional industry experience, front-end development, Master of Data Science at Monash, starting research at Monash next semester |
| Shivam Hendru | Business Development + PM | Client relationship management, team leadership, product management, business development experience |

---

## 🧪 Validation & Traction

- Conducted multiple in-depth interviews across students, non-native speakers, individuals with speech differences, Audiology/SLP professors, and practising speech therapists
- Several therapists confirmed they would recommend the platform as a complement to therapy
- Direct contact with two senior Monash University professors who have active speech-impediment patients and are advising on clinical credibility
- Reviewed existing competitor apps used by parents — identified consistent shortcomings (too clinical, not personalised, not engaging for children)
- Completed initial wireframes, early-stage code, and working technical architecture
- Currently developing ML model for disfluency detection

**Key insight from interviews:** Users value engagement, safety, and consistency over technical complexity. Improving motivation to practise is as important as the feedback itself.

---

## 🏆 Wins & Recognition

- 🏆 **UniHack 2026** — People's Choice Winner
- 🏆 **Monash Generator Validator Program** — Winner (20+ teams)
- 💰 **$500 Monash Generator Grant** secured

---

## 💰 Resources & Budget

| Item | Amount |
|------|--------|
| Speech recognition + AI APIs (OpenAI/Google/Anthropic) | $220 |
| User testing incentives (15–20 targeted users) | $200 |
| Domain, hosting, waitlist landing page | $80 |
| **Total** | **$500** |

---

## 🏥 Clinical Strategy

- Positioned strictly as a **"practice companion"** not a **"therapy replacement"**
- Therapist use cases: assign practice between sessions, track patient progress, improve session efficiency, create personalised plans for each patient within the app
- Direct access to two senior Monash professors with active speech-impediment patients for clinical validation
- All feedback strings designed to be encouraging, age-appropriate, and never negative

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Clinical accuracy of AI feedback | Close consultation with Monash professors + iterative testing |
| False feedback harming user confidence | Encouraging-only feedback design, therapist oversight |
| Retention (users dropping off) | Avatar-based engagement, adaptive progression, therapist-assigned plans |
| Overbuilding too early | Strict MVP scope (stutter only, children only, 100 phrases) |
| No therapist co-founder | Direct professor access as clinical credibility substitute |

---

## 📅 12-Month Roadmap

| Period | Milestones |
|--------|------------|
| Months 1–2 | Core system, speech recognition, stutter/lisp feedback, early user testing |
| Months 3–4 | Onboard users, gather feedback, iterate, track engagement |
| Months 5–6 | Accent understanding, skill assessment, personalised learning pathways |
| Months 7–9 | Profession-based coaching, interview simulations |
| Months 10–12 | Public speaking features, refinement, next funding stage |

---

## 🎯 Pitch One-Liner

> *"Language AI is a personalised speech companion that helps people with speech impediments practice, improve, and build confidence through real-time AI feedback."*

---

## 📌 Outstanding / Next Steps

- 100 phrases need clinical review and approval from Monash professors
- Frontend (React + avatar UI) not yet built
- BE and ML repos being built (Cursor prompts ready)
- Startup Sprint 2026 application submitted (July 4–5 intensive)
- Broader user testing planned post-sprint with real families and therapists
