# 🗣️ Phonemes, Visemes & Lip-Sync — How the Avatar "Talks"

A plain-language explainer for the team on how speech sounds map to the avatar's
mouth, what the browser can and can't do, and how we build real articulation.

---

## 1. What is a phoneme?

A **phoneme** is the smallest unit of *sound* in speech. Not letters — sounds.
The word **"rabbit"** is written with 6 letters but is made of ~5 phonemes:

```
rabbit  →  /r/  /æ/  /b/  /ɪ/  /t/
            r    a    b    i    t
```

English has ~44 phonemes total (the letter "a" alone makes several: cat, car,
cake…). When you say a word, your mouth moves through its phonemes one after
another.

---

## 2. What is a viseme? (the part that matters for the avatar's lips)

A **viseme** is the mouth shape for a sound — the *visual* version of a phoneme.
Several phonemes look the same on the lips, so there are fewer visemes (~12–15)
than phonemes. For example:

- `/p/ /b/ /m/` → lips **pressed shut** (same shape — "puh", "buh", "muh" look identical)
- `/f/ /v/` → top teeth on bottom lip
- `/oo/` → lips **rounded** (like "boot")
- `/ah/` → mouth **wide open** (like "father")

So to make the fox "form the words" so a child learns articulation, the avatar
must move through the right **visemes, in time** with the audio.

---

## 3. What the browser's Speech API actually gives us

The app speaks phrases with the browser's built-in **`SpeechSynthesis`** API
(`speechSynthesis.speak(...)`). It's free and needs no server, but it's a **black
box**: you give it text, it produces audio. It only tells us a few things via
events:

| Event             | What it tells us                                  | Useful for                |
| ----------------- | ------------------------------------------------- | ------------------------- |
| `onstart`/`onend` | speech started / finished                         | knowing when it's talking |
| `onboundary`      | "a new WORD just started, at character index N"   | ✅ word highlighting      |

That's it. Crucially, it gives us **word boundaries but NOT phoneme/viseme
timing**. It will tell us "the word *rabbit* starts now," but not "right now the
mouth is making /r/… now /æ/… now /b/."

---

## 4. How that affects what we can build

This single limitation explains both decisions:

- ✅ **Word highlighting** (built) uses `onboundary`. The browser says "word 3
  starts at character 11" → we light up *rabbit*. We have this data, so it works
  right now, for free.
- ❌ **Real lip-sync** (mouth forming each sound) needs **per-phoneme timing**,
  which the browser API simply doesn't expose. That's why you can't get true
  visemes from the browser, and why you need one of:
  - **Rhubarb Lip Sync** — runs *offline* on each phrase's audio file and outputs
    a timeline of mouth shapes ("at 0.0s shape A, at 0.12s shape D…"). Perfect for
    our **100 fixed phrases** — generate once, ship the timeline.
  - **Azure TTS** — a paid speech service that *does* fire **viseme events with
    timestamps** as it speaks, so you can drive the mouth live for any text.

---

## In one sentence

> A **phoneme** is a unit of sound, a **viseme** is the lip shape for it, and the
> browser's free speech engine hands us **word positions but not sound-by-sound
> timing** — so we can highlight **which word** is being said (done ✅), but making
> the lips **form each sound** needs an extra tool (Rhubarb or Azure) that provides
> phoneme timing.

---

## 5. Our approach: pre-generated mouth timelines (Rhubarb, offline)

Because the app uses a **fixed set of phrases**, we don't need a live phoneme
engine. We generate everything **once, ahead of time**:

```
  phrase text ──▶ TTS audio (.wav) ──▶ Rhubarb ──▶ mouth-cue JSON
                                                   [{start, end, value}, …]
```

We ship the **audio + cue file** with the app. At runtime we simply **play the
audio and swap the mouth shape** as each cue's timestamp passes. No server, no
runtime API, deterministic and high quality.

Rhubarb outputs 9 basic mouth shapes (the Preston Blair set), which map 1:1 to a
2D mouth chart or to 3D visemes:

| Cue | Mouth shape (roughly)         | Sounds                |
| --- | ----------------------------- | --------------------- |
| A   | closed                        | p, b, m               |
| B   | slightly open, teeth together | k, s, t, d, g…        |
| C   | open                          | eh, ae                |
| D   | wide open                     | ah                    |
| E   | rounded, slightly open        | aw                    |
| F   | puckered                      | oo, w                 |
| G   | teeth on lip                  | f, v                  |
| H   | "L" tongue shape              | l                     |
| X   | rest / idle                   | silence               |

See `frontend/tools/generate-lipsync` for the generator and
`frontend/public/lipsync/` for the generated audio + cues.
