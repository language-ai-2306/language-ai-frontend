# Ollie — Voice Samples (Neural)

Calm, child-friendly candidate voices for the speaking-buddy mascot — **2 female,
2 male**. Open `index.html` in a browser to listen to all four with players, or
play the `.m4a` files directly.

## Source

Generated with **Piper** — a free, open-source **neural** text-to-speech engine
that runs **fully offline** (no API key, no per-use cost). Voices are from the
Piper voice library (rendered on-device). Engine set up in `tools/piper/`.

- **Engine:** Piper neural TTS (https://github.com/OHF-Voice/piper1-gpl)
- **Voices:** Piper voice library — see table below
- **Render settings:** `--length-scale 1.1` (slightly slowed for a calm pace),
  exported to AAC `.m4a` via macOS `afconvert`
- **License:** Piper is MIT; individual voices carry their own (mostly permissive)
  licenses — verify per voice before commercial shipping. Treat these as demo
  renders for choosing a direction.

> Citation you can give: *"Voice samples synthesized with Piper, an open-source
> offline neural text-to-speech engine, using voices from the Piper voice library."*

## The voices

Same script for all (so they're directly comparable):

> "Hi! I'm Ollie, your speaking buddy. Let's practice together. Take a slow,
> deep breath. Now say it with me: the little rabbit jumped over the log.
> Wonderful job — you did it!"

| File | Voice | Gender / accent |
|---|---|---|
| `female-1-amy-us.m4a` | Amy (`en_US-amy-medium`) | Female · US, warm |
| `female-2-alba-gb.m4a` | Alba (`en_GB-alba-medium`) | Female · British, gentle |
| `male-1-ryan-us.m4a` | Ryan (`en_US-ryan-medium`) | Male · US, natural |
| `male-2-joe-us.m4a` | Joe (`en_US-joe-medium`) | Male · US, soft |

## Generating more / re-rendering

The Piper engine lives in `tools/piper/`. To render new text or try other voices:

```bash
tools/piper/say.sh "Your text here" en_US-amy-medium
```

Browse + audition the full voice library: https://rhasspy.github.io/piper-samples/
See `tools/piper/README.md` for full usage and how this feeds the app's lip-sync.
