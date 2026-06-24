"""Tests for the streamed-audio attempt pipeline (WebSocket /api/attempts/ws)."""
from __future__ import annotations

import pathlib

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)

# A browser sends an Origin header; the endpoint vets it against the allow-list.
_ALLOWED_ORIGIN = {"origin": settings.cors_origin_list[0]}


def _cleanup(attempt_id: str) -> None:
    for f in pathlib.Path(settings.audio_storage_dir).glob(f"{attempt_id}*"):
        f.unlink(missing_ok=True)


def _drain_to_terminal(ws) -> dict:
    """Read frames until a feedback/error frame, then return it."""
    while True:
        msg = ws.receive_json()
        if msg["type"] in ("feedback", "error"):
            return msg


def test_attempt_returns_feedback_with_events_and_timestamps() -> None:
    audio = bytes(range(256)) * 12  # ~3 KB of deterministic bytes
    with client.websocket_connect("/api/attempts/ws", headers=_ALLOWED_ORIGIN) as ws:
        ws.send_json({"type": "start", "exercise": "read", "target": "red fox", "mime": "audio/webm"})
        for i in range(0, len(audio), 1024):
            ws.send_bytes(audio[i : i + 1024])
        ws.send_json({"type": "end", "durationMs": 3200})
        msg = _drain_to_terminal(ws)

    assert msg["type"] == "feedback"
    assert msg["headline"] and msg["detail"]
    assert 0 <= msg["smoothness"] <= 100
    assert msg["duration_ms"] == 3200
    assert len(msg["events"]) >= 1
    for ev in msg["events"]:
        assert ev["start_ms"] <= ev["end_ms"]
        assert 0.0 <= ev["confidence"] <= 1.0
        assert ev["type"] in {"fluent", "repetition", "prolongation", "block", "interjection"}
    _cleanup(msg["id"])


def test_attempt_is_deterministic_for_identical_audio() -> None:
    audio = b"\x42" * 2048

    def run() -> dict:
        with client.websocket_connect("/api/attempts/ws", headers=_ALLOWED_ORIGIN) as ws:
            ws.send_json({"type": "start", "exercise": "repeat", "target": "hi", "mime": "audio/webm"})
            ws.send_bytes(audio)
            ws.send_json({"type": "end", "durationMs": 2000})
            return _drain_to_terminal(ws)

    a, b = run(), run()
    assert a["smoothness"] == b["smoothness"]
    assert a["events"] == b["events"]
    _cleanup(a["id"])
    _cleanup(b["id"])


def test_attempt_uses_target_sentence_in_analysis() -> None:
    # Identical audio but a different reference sentence should be able to
    # produce different placeholder detections — i.e. `target` reaches the model.
    audio = bytes(range(200)) * 16  # ~3.2 KB

    def run(target: str) -> dict:
        with client.websocket_connect("/api/attempts/ws", headers=_ALLOWED_ORIGIN) as ws:
            ws.send_json({"type": "start", "exercise": "read", "target": target, "mime": "audio/webm"})
            ws.send_bytes(audio)
            ws.send_json({"type": "end", "durationMs": 4000})
            return _drain_to_terminal(ws)

    a = run("The sun is bright today.")
    b = run("My dog runs very fast.")
    assert a["events"] != b["events"]
    _cleanup(a["id"])
    _cleanup(b["id"])


def test_attempt_rejects_unsupported_format() -> None:
    with client.websocket_connect("/api/attempts/ws", headers=_ALLOWED_ORIGIN) as ws:
        ws.send_json({"type": "start", "exercise": "read", "mime": "audio/flac"})
        msg = ws.receive_json()
    assert msg["type"] == "error"


def test_attempt_rejects_empty_recording() -> None:
    with client.websocket_connect("/api/attempts/ws", headers=_ALLOWED_ORIGIN) as ws:
        ws.send_json({"type": "start", "exercise": "read", "mime": "audio/webm"})
        ws.send_bytes(b"\x00" * 8)  # below settings.min_audio_bytes
        ws.send_json({"type": "end", "durationMs": 100})
        msg = _drain_to_terminal(ws)
    assert msg["type"] == "error"


def test_attempt_rejects_chunk_before_start() -> None:
    with client.websocket_connect("/api/attempts/ws", headers=_ALLOWED_ORIGIN) as ws:
        ws.send_bytes(b"audio-before-start")
        msg = ws.receive_json()
    assert msg["type"] == "error"
