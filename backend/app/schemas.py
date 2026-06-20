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
