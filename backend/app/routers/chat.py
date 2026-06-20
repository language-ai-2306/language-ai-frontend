"""Chat endpoint — returns an avatar reply.

Stateless and read-only: no database, no auth. Input is bound and validated by
``ChatRequest``; the response is the explicit ``ChatResponse`` schema so nothing
internal leaks.

When an Anthropic API key is configured, replies come from Claude (see
``app.llm``). Otherwise the deterministic dummy generator is used, so the
backend works with zero configuration. The LLM path always falls back to the
dummy on error — the avatar never goes silent.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, status

from app.config import settings
from app.dummy_data import generate_reply
from app.schemas import ChatRequest, ChatResponse

logger = logging.getLogger("languageai.chat")

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat(payload: ChatRequest) -> ChatResponse:
    """Accept a user message and return a reply + mood for the avatar."""
    # Security-relevant event log: record that a message arrived and its size,
    # but never the raw content (avoid logging user data by default).
    logger.info("chat request received (%d chars)", len(payload.message))

    if settings.resolved_anthropic_key:
        try:
            # Imported lazily so the dummy path has no hard SDK dependency.
            from app.llm import generate_reply_llm

            result = await generate_reply_llm(payload.message)
            return ChatResponse(
                reply=result.reply,
                mood=result.mood,
                word_count=len(result.reply.split()),
            )
        except Exception:  # noqa: BLE001 — any failure degrades to the dummy reply
            logger.exception("LLM reply failed; falling back to dummy generator")

    return generate_reply(payload.message)
