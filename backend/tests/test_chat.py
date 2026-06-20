"""Tests for the dummy chat + health endpoints (via the test-master skill)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok() -> None:
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "version" in body


def test_chat_returns_reply_and_mood() -> None:
    res = client.post("/api/chat", json={"message": "Thanks, you are great!"})
    assert res.status_code == 200
    body = res.json()
    assert body["mood"] == "happy"
    assert "Thanks, you are great!" in body["reply"]
    assert body["word_count"] == len(body["reply"].split())


def test_chat_detects_question_as_thinking() -> None:
    res = client.post("/api/chat", json={"message": "How does this work?"})
    assert res.status_code == 200
    assert res.json()["mood"] == "thinking"


def test_chat_rejects_blank_message() -> None:
    res = client.post("/api/chat", json={"message": "   "})
    assert res.status_code == 422


def test_chat_rejects_overlong_message() -> None:
    res = client.post("/api/chat", json={"message": "x" * 501})
    assert res.status_code == 422


def test_chat_strips_whitespace() -> None:
    res = client.post("/api/chat", json={"message": "  hello  "})
    assert res.status_code == 200
    assert "hello" in res.json()["reply"]
