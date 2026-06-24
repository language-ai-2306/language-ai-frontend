# 🎨 Language AI — Master UI Design Prompt

A reusable, master-level prompt for guiding an LLM to produce **design documentation**
for Language AI. Built from `PROJECT_OVERVIEW.md`.

**How to use:** Paste **§1 Shared Foundation** + **§3 Deliverable** once, then add the
**§2 Screen** block(s) you want documented. Or paste the whole file to document the
full product. Tweak the `[bracketed]` choices to taste.

---

## §1 — Shared Foundation (paste this for every screen)

> **Context:** Design a **responsive web app (desktop + tablet, mobile-friendly)** for
> an **AI voice-first speech-practice companion** that helps users **practice speaking
> known phrases out loud and receive real-time, encouraging, personalised feedback on
> their fluency** — positioned as a companion to speech therapy, not a replacement.
>
> **Target User:** Designed primarily for **children aged 5–14 who stutter**, and
> secondarily for the **parents and speech pathologists** who support them — users who
> care about **emotional safety, zero judgement, staying motivated to practise, and
> seeing measurable improvement over time.** The child experience must feel calm,
> playful and non-intimidating (anchored by a friendly cartoon AI avatar companion);
> the grown-up experiences must feel clear, trustworthy and data-forward.
>
> **Visual Style:** Use a **soft, calming pastel palette** — a gentle indigo/violet
> primary, mint/teal for positive & fluency signals, warm cream/sand neutrals, and a
> single warm coral accent used sparingly. **Never use harsh red or any "error" red on
> a child's speech — feedback is encouraging-only.** Use **large, rounded corners
> (16–24px)** for a soft, safe feel, and **friendly rounded typography** for child
> screens (e.g. Baloo 2 / Nunito, oversized and highly legible) paired with a **clean
> neutral sans (e.g. Inter)** for dashboards and data. Meet **WCAG AA contrast**, use
> **large tap targets**, support **reduced motion**, and keep the cartoon avatar central
> to the child's emotional connection.

**Shared design facts to honour (from the product spec):**
- Disfluency types: **repetitions, prolongations, blocks, interjections/fillers, revisions**.
- Tracked metrics: **Fluency (0–100), Confidence (0–100), Clarity (0–100), WPM, average
  pause duration, stutter frequency (%), repetition count**.
- Content library: **100 clinically-designed phrases**; therapists assign personalised plans.
- Flow per attempt: child speaks a known phrase → audio analysed → **scores + kid-friendly
  feedback** returned. Performance target: **sub-300ms** response feel.
- Tone rule: **all feedback is encouraging, age-appropriate, and never negative.**

---

## §2 — Per-Screen Prompts (add the ones you need)

### 2.1 Child · Practice Screen (Read-aloud / Repeat)
> **Screen Goal:** The primary objective of this screen is to **let a child comfortably
> read or repeat one assigned phrase aloud, feel safe and unhurried while doing it, and
> record their attempt with a single tap.**
> **Layout & Structure:** A **single-column, distraction-free** layout featuring a
> **cartoon avatar at the top that models the phrase and reacts (idle / listening /
> thinking)**, a **large central phrase card**, a **prominent circular record (mic)
> button as the focal control**, a quiet **"hear it again"** replay, and a **slim
> progress indicator ("phrase 3 of 8")**. No timers, no scores, minimal chrome.

### 2.2 Child · Feedback / Results Screen
> **Screen Goal:** The primary objective of this screen is to **celebrate the child's
> effort and present gentle, encouraging feedback with one simple positive score, then
> invite them to try again or move on.**
> **Layout & Structure:** A **centered single-column** layout featuring the **phrase
> recapped at top**, the **avatar reacting positively**, one **hero fluency/"smoothness"
> meter or ring (0–100)**, **1–2 kid-friendly tips**, primary **"Try again"** and
> secondary **"Next"** actions, and a collapsible **"For grown-ups"** disclosure
> revealing the detailed disfluency events with timestamps and confidence.

### 2.3 Child · Home / Companion Hub
> **Screen Goal:** The primary objective of this screen is to **warmly welcome the child,
> surface today's assigned practice plan, and make starting practice a single tap.**
> **Layout & Structure:** A **single-column** layout featuring an **avatar greeting with
> the child's name**, a **"Today's plan" hero CTA card**, a gentle **streak / stars
> row (light gamification)**, and a small **grid of activity tiles** (Read aloud, Repeat,
> Calm breathing, Free chat).

### 2.4 Child · Progress (kid-friendly)
> **Screen Goal:** The primary objective of this screen is to **show the child their
> improvement in an encouraging, visual, non-clinical way that motivates them to keep going.**
> **Layout & Structure:** A **single-column** layout featuring a **growth metaphor
> (a plant that grows / a journey map)**, **earned stars & badges**, a **simple friendly
> trend** of recent practice, and an encouraging summary message — numeric clinical
> scores intentionally de-emphasised here.

### 2.5 Parent Dashboard
> **Screen Goal:** The primary objective of this screen is to **let a parent see, at a
> glance, how consistently their child is practising and how they're improving — so they
> can encourage without pressure.**
> **Layout & Structure:** A **two-column / card-grid** layout featuring a **child profile
> header**, **trend cards for Fluency / Confidence / Clarity**, a **practice-consistency
> (streak / weekly) visual**, a **recent-sessions list**, and a **notes-from-therapist** panel.

### 2.6 Therapist Dashboard
> **Screen Goal:** The primary objective of this screen is to **let a speech pathologist
> monitor multiple patients, drill into objective progress data, and manage practice
> plans efficiently between sessions.**
> **Layout & Structure:** A **sidebar + content** layout featuring a **searchable patient
> list/table**, and a **per-patient detail view** with **time-series charts (Fluency,
> Confidence, Clarity, WPM, average pause, stutter %)**, a **disfluency-type breakdown**,
> a **session history with audio playback and event timestamps**, and an entry point to
> the **plan builder**. Clean, data-dense, clinical-professional.

### 2.7 Therapist · Personalised Plan Builder
> **Screen Goal:** The primary objective of this screen is to **let a therapist build and
> assign a personalised practice plan from the phrase library, targeting specific
> disfluencies, and schedule it for a patient.**
> **Layout & Structure:** A **three-pane** layout featuring a **searchable/filterable
> phrase library (filter by difficulty & disfluency focus)** on the left, a **selected-plan
> panel** in the center (ordered phrases, target goals, frequency), and a **patient +
> scheduling panel** on the right, with a clear **"Assign plan"** action.

---

## §3 — Deliverable (paste this at the end)

> **Produce design documentation, not just a single mockup.** For the screen(s) above, deliver:
> 1. **Information architecture** — where the screen sits and how users navigate to/from it.
> 2. **Annotated layout spec** — sections, hierarchy, spacing, and responsive behaviour
>    (desktop / tablet / mobile).
> 3. **Component inventory** — every reusable component with its variants and props.
> 4. **Design tokens** — color palette (with hex + roles), typography scale, spacing scale,
>    corner radii, and elevation/shadows.
> 5. **Interaction & states** — idle, recording, analysing, success/feedback, empty, loading,
>    and error states (remember: encouraging-only, never punitive for the child).
> 6. **Accessibility notes** — WCAG AA contrast, large tap targets for young children,
>    dyslexia-friendly text options, reduced-motion behaviour, and screen-reader labels.
> 7. **Content & tone guidelines** — sample microcopy that is warm, age-appropriate, and
>    never negative.
> Present it as clear, structured markdown a designer/developer could build from directly.

---

## §4 — Quick variables to customise
- Audience mode: `[child playful-calm]` vs `[grown-up data-forward]`
- Platform: `[responsive web]` → swap to `[native mobile]` if needed
- Visual mood: `[soft calming pastel]` → e.g. `[bright gamified]` or `[clean clinical]`
- Corner style: `[large rounded 16–24px]`
- Type vibe: `[friendly rounded for kids + neutral sans for data]`
