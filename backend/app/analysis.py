"""Attempt-analysis pipeline — the path from a recorded clip to safe feedback.

This is the backend half of one practice attempt. Each stage is a small,
swappable function so the detection model can be dropped in without touching the
WebSocket router:

    validate_audio  → reject empty / oversized / unknown-format clips   (step 5)
    to_model_input  → transcode to the detection model's format         (step 6)
    detect_events   → run the dysfluency detection model                (steps 7–8)
    build_feedback  → turn raw events into safe, encouraging copy        (step 9)

``analyze_attempt`` runs them in order. The model is not wired yet, so
``detect_events`` is a DETERMINISTIC STUB (see the marked SEAM) — it does not
actually analyse speech. Everything around it is real and won't change when the
model lands; swap the stub's body for a real inference call.
"""
from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass

from app.config import settings
from app.schemas import AttemptFeedback, DetectedEvent, EventType

logger = logging.getLogger("languageai.analysis")

# Container formats a browser MediaRecorder can realistically produce, mapped to
# the extension we store them under. The router persists the upload using these;
# the pipeline validates against the same set.
MIME_EXT: dict[str, str] = {
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/mp4": ".m4a",
    "audio/mpeg": ".mp3",
    "audio/aac": ".aac",
}


class AudioValidationError(Exception):
    """Raised when an uploaded recording can't be analysed (bad/empty/too big).

    The message is safe to show the user — keep it gentle and non-technical.
    """


# --- Step 5: validate --------------------------------------------------------


def validate_audio(*, num_bytes: int, mime: str) -> None:
    """Reject clearly unusable uploads before doing any work."""
    if mime not in MIME_EXT:
        raise AudioValidationError("That audio format isn't supported.")
    if num_bytes < settings.min_audio_bytes:
        raise AudioValidationError("That recording was empty — give it another go!")
    if num_bytes > settings.max_audio_bytes:
        raise AudioValidationError("That recording was too long. Try a shorter one!")


# --- Step 6: convert to the model's input format -----------------------------


@dataclass
class ModelInput:
    """Audio prepared for the detection model.

    Today this passes the original bytes through unchanged. Once a model is
    chosen, ``to_model_input`` should transcode to the format it expects (most
    speech models want 16 kHz mono PCM WAV); ``sample_rate`` is 0 until then to
    signal "unconverted".
    """

    data: bytes
    mime: str
    sample_rate: int = 0


def to_model_input(audio: bytes, mime: str) -> ModelInput:
    """Transcode the raw recording into the detection model's input format.

    TODO(model): the browser sends webm/opus (or ogg/mp4); transcode to the
    model's required format here, e.g. with ffmpeg:
        ffmpeg -i in.webm -ac 1 -ar 16000 -f wav out.wav
    Passing the bytes through unchanged keeps the pipeline runnable with no model
    and no transcoding dependency installed yet.
    """
    return ModelInput(data=audio, mime=mime, sample_rate=0)


# --- Steps 7–8: the detection model ------------------------------------------

# Dysfluency categories the stub can emit, in a stable order (used for tips too).
_DETECTABLE: tuple[EventType, ...] = (
    EventType.repetition,
    EventType.prolongation,
    EventType.block,
    EventType.interjection,
)


def detect_events(
    model_input: ModelInput, duration_ms: int, target: str | None = None
) -> list[DetectedEvent]:
    """SEAM — the dysfluency detection model. Replace this body with a real call.

    ``target`` is the reference word/sentence the user was asked to repeat. The
    real model should use it to locate *issues in that sentence* — i.e. compare
    the spoken audio against the expected text and flag where they diverge.

    Deterministic placeholder: derives a stable, plausible set of events from a
    hash of the audio (and the target, so different sentences differ) so the rest
    of the pipeline (and the UI) can be exercised end-to-end before the model
    exists. It does NOT analyse speech.

    To wire the real model, replace the loop below with inference over
    ``model_input.data`` against ``target`` and map its output onto
    ``DetectedEvent``.
    """
    if duration_ms <= 0 or not model_input.data:
        return []

    # TODO(model): align `model_input.data` to `target` and flag divergences.
    # Stable per-(recording, target) seed → identical input yields identical
    # "detections"; varying the sentence varies the placeholder output.
    digest = hashlib.sha256(model_input.data + (target or "").encode("utf-8")).digest()
    seed = int.from_bytes(digest[:4], "big")
    windows = max(1, duration_ms // 1000)  # ~one candidate window per second

    events: list[DetectedEvent] = []
    for i in range(windows):
        roll = (seed >> (i * 3)) & 0x7  # 0..7
        start = round(i * duration_ms / windows)
        end = round((i + 1) * duration_ms / windows)
        if roll < 4:  # majority fluent
            etype = EventType.fluent
            conf = 0.80 + roll * 0.04
        else:
            etype = _DETECTABLE[(seed + i) % len(_DETECTABLE)]
            conf = 0.55 + (roll - 4) * 0.12
        events.append(
            DetectedEvent(type=etype, start_ms=start, end_ms=end, confidence=round(min(conf, 0.99), 2))
        )
    return events


# --- Step 9: convert detections into safe, encouraging feedback --------------

# Gentle, non-clinical suggestions keyed by detected type. Never diagnostic.
_TIPS: dict[EventType, str] = {
    EventType.repetition: "If a sound repeats, try gliding smoothly into the next one.",
    EventType.prolongation: "Stretch sounds gently, then let them ease off.",
    EventType.block: "If you feel stuck, pause, take a breath, and start softly.",
    EventType.interjection: "Little “um”s are okay — there's no rush.",
}


def build_feedback(events: list[DetectedEvent], duration_ms: int) -> AttemptFeedback:
    """Map raw events to positive, age-appropriate feedback. No pass/fail."""
    total = len(events)
    fluent = sum(1 for e in events if e.type == EventType.fluent)
    smoothness = round(100 * fluent / total) if total else 100

    dysfluent = {e.type for e in events if e.type != EventType.fluent}
    tips = [_TIPS[t] for t in _DETECTABLE if t in dysfluent][:2]
    secs = max(0, round(duration_ms / 1000))

    if smoothness >= 80:
        headline = "Wow, super smooth! 🌟"
    elif smoothness >= 50:
        headline = "Nice work — keep it up! 💪"
    else:
        headline = "Great effort — every try counts! 🎉"

    if dysfluent:
        detail = (
            f"You spoke for about {secs}s. I heard lots of good moments and a few "
            "little bumps — and that's completely okay."
        )
    else:
        detail = f"You spoke for about {secs}s and it sounded lovely and smooth!"

    return AttemptFeedback(
        headline=headline,
        detail=detail,
        tips=tips,
        smoothness=smoothness,
        duration_ms=duration_ms,
        events=events,
    )


# --- Orchestrator ------------------------------------------------------------


def analyze_attempt(
    *, audio: bytes, mime: str, duration_ms: int, target: str | None = None
) -> AttemptFeedback:
    """Run the full pipeline for one recording. Raises ``AudioValidationError``.

    ``target`` is the reference sentence/word being repeated, passed to the
    detection model so it can find issues relative to what was expected.
    """
    validate_audio(num_bytes=len(audio), mime=mime)  # step 5
    model_input = to_model_input(audio, mime)  # step 6
    events = detect_events(model_input, duration_ms, target)  # steps 7–8
    feedback = build_feedback(events, duration_ms)  # step 9
    logger.info(
        "analysed attempt: %d events, smoothness=%d", len(events), feedback.smoothness
    )
    return feedback
