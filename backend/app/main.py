"""FastAPI application entrypoint.

Run locally with:
    uvicorn app.main:app --reload --port 8000
Interactive docs: http://localhost:8000/docs
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import settings
from app.routers import chat, health

logging.basicConfig(level=logging.DEBUG if settings.debug else logging.INFO)

app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description="Dummy backend for the LanguageAI talking-avatar frontend.",
)

# CORS — restricted to the configured frontend origins, only the methods we use.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# All app routes live under /api.
app.include_router(health.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    return {"name": settings.app_name, "version": __version__, "docs": "/docs"}
