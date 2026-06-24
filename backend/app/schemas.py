"""Pydantic V2 schemas — the public contract of the API.

Request models bound and sanitize input; response models explicitly list the
fields we return so internal state can never leak.
"""
from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, field_validator


class Mood(str, Enum):
    """Expression the avatar should adopt while speaking a reply."""

    neutral = "neutral"
    happy = "happy"
    excited = "excited"
    thinking = "thinking"
    sad = "sad"


class ChatRequest(BaseModel):
    """Inbound user message."""

    model_config = {"str_strip_whitespace": True}

    message: str = Field(min_length=1, max_length=500, description="User message to the avatar")

    @field_validator("message")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message must not be blank")
        return v


class ChatResponse(BaseModel):
    """Outbound avatar reply. Explicit fields only — no internal leakage."""

    reply: str = Field(description="Text the avatar should speak")
    mood: Mood = Field(description="Expression to drive the avatar animation")
    word_count: int = Field(ge=0, description="Number of words in the reply")


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str


# --- Practice-attempt analysis (audio → detected events → safe feedback) -----


class EventType(str, Enum):
    """A speech event a detection model may emit for a recording.

    Kept neutral on the backend; the child-facing wording is produced in
    ``app.analysis.build_feedback`` so nothing clinical reaches the UI directly.
    """

    fluent = "fluent"
    repetition = "repetition"
    prolongation = "prolongation"
    block = "block"
    interjection = "interjection"


class DetectedEvent(BaseModel):
    """One model-detected event and where it occurs in the recording."""

    type: EventType
    start_ms: int = Field(ge=0, description="Event start offset within the clip")
    end_ms: int = Field(ge=0, description="Event end offset within the clip")
    confidence: float = Field(ge=0.0, le=1.0, description="Model confidence 0–1")


class AttemptFeedback(BaseModel):
    """Safe, encouraging feedback derived from the raw detection events.

    ``headline``/``detail``/``tips`` are what the child sees; ``events`` carries
    the raw timestamps for an app/grown-up view. Tone is always positive — there
    is no pass/fail, mirroring the practice screens' design.
    """

    headline: str = Field(description="Short, upbeat one-liner")
    detail: str = Field(description="Gentle, constructive sentence")
    tips: list[str] = Field(default_factory=list, description="Soft suggestions (may be empty)")
    smoothness: int = Field(ge=0, le=100, description="Positive 0–100 'smoothness' score")
    duration_ms: int = Field(ge=0)
    events: list[DetectedEvent] = Field(default_factory=list)
