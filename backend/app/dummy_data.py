"""Dummy reply generation.

This stands in for a real model/LLM. It produces a deterministic, lightly
personality-flavored reply plus a mood derived from the user's message, so the
frontend avatar has something to speak and emote with. Swap this module for a
real LLM call (e.g. the Anthropic SDK) later without touching the routers.
"""
from __future__ import annotations

from .schemas import ChatResponse, Mood

# Keyword → mood heuristics. First match wins; order matters.
_MOOD_KEYWORDS: list[tuple[Mood, tuple[str, ...]]] = [
    (Mood.happy, ("thanks", "thank you", "love", "great", "awesome", "nice", "good")),
    (Mood.excited, ("wow", "amazing", "cool", "yay", "let's go", "incredible", "!")),
    (Mood.sad, ("sad", "sorry", "bad", "tired", "hate", "angry", "upset")),
    (Mood.thinking, ("why", "how", "what", "when", "where", "who", "?")),
]

# Templated replies per mood. ``{msg}`` is the (echoed) user message.
_TEMPLATES: dict[Mood, str] = {
    Mood.happy: "Aw, that makes me happy! You said: {msg}",
    Mood.excited: "Whoa, exciting! I heard you say: {msg}",
    Mood.thinking: "Hmm, let me think about that... You asked: {msg}",
    Mood.sad: "Oh no, I'm sorry to hear that. You said: {msg}",
    Mood.neutral: "You said: {msg}. Tell me more!",
}


def _detect_mood(message: str) -> Mood:
    lowered = message.lower()
    for mood, keywords in _MOOD_KEYWORDS:
        if any(k in lowered for k in keywords):
            return mood
    return Mood.neutral


def generate_reply(message: str) -> ChatResponse:
    """Build a dummy avatar reply for the given user message."""
    mood = _detect_mood(message)
    reply = _TEMPLATES[mood].format(msg=message)
    return ChatResponse(reply=reply, mood=mood, word_count=len(reply.split()))
