"""Real avatar replies via Claude (Anthropic SDK).

Drop-in replacement for ``dummy_data.generate_reply``. Uses the async client
(FastAPI is async) and structured outputs so the model returns exactly the
``{reply, mood}`` shape the avatar needs — no brittle JSON parsing.

Built following the claude-api skill: ``AsyncAnthropic`` + ``messages.parse``,
model ``claude-opus-4-8``.
"""
from __future__ import annotations

import logging
from functools import lru_cache

from anthropic import AsyncAnthropic
from pydantic import BaseModel

from .config import settings
from .schemas import Mood

logger = logging.getLogger("languageai.llm")

SYSTEM_PROMPT = (
    "You are the voice of a friendly, upbeat cartoon avatar (think Talking Tom). "
    "Reply to the user in 1-3 short sentences that sound natural read aloud — no "
    "markdown, no emoji, no stage directions. Then pick the single mood that best "
    "matches the feeling of your reply."
)


class LLMReply(BaseModel):
    """Structured output schema the model must fill."""

    reply: str
    mood: Mood


@lru_cache(maxsize=1)
def _client() -> AsyncAnthropic:
    # Reused across requests; safe to cache. Key is resolved once here.
    return AsyncAnthropic(api_key=settings.resolved_anthropic_key)


async def generate_reply_llm(message: str) -> LLMReply:
    """Ask Claude for an in-character reply + mood. Raises on API/parse failure."""
    response = await _client().messages.parse(
        model=settings.anthropic_model,
        max_tokens=300,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": message}],
        output_format=LLMReply,
    )
    parsed = response.parsed_output
    if parsed is None:
        raise RuntimeError("Model returned no structured output")
    return parsed
