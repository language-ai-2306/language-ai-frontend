"""Chat endpoint — returns a dummy avatar reply.

Stateless and read-only: no database, no auth (dummy backend). Input is bound
and validated by ``ChatRequest``; the response is the explicit ``ChatResponse``
schema so nothing internal leaks.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, status

from app.dummy_data import generate_reply
from app.schemas import ChatRequest, ChatResponse

logger = logging.getLogger("languageai.chat")

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat(payload: ChatRequest) -> ChatResponse:
    """Accept a user message and return a dummy reply + mood for the avatar."""
    # Security-relevant event log: record that a message arrived and its size,
    # but never the raw content (avoid logging user data by default).
    logger.info("chat request received (%d chars)", len(payload.message))
    return generate_reply(payload.message)
