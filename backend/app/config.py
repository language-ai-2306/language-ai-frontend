"""Application configuration, loaded from the environment.

No secrets are hardcoded — values come from environment variables (or a local
``.env`` file) via ``pydantic-settings``.
"""
from __future__ import annotations

import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="LANGUAGEAI_",
        extra="ignore",
    )

    app_name: str = "LanguageAI API"
    debug: bool = False

    # Comma-separated list of allowed frontend origins for CORS.
    # Defaults cover the Vite dev server.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # When an API key is available, the chat endpoint uses a real Claude model
    # instead of the dummy generator. Leave unset to keep the zero-config dummy
    # backend. The standard ANTHROPIC_API_KEY env var is honored as a fallback.
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-opus-4-8"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def resolved_anthropic_key(self) -> str | None:
        return self.anthropic_api_key or os.environ.get("ANTHROPIC_API_KEY")


settings = Settings()
