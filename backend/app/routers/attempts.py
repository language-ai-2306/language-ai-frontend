"""WebSocket endpoint for streaming practice-attempt audio to the backend.

The frontend records the user's *real* speech (stutters, repetitions and all)
and streams it here in chunks over a single persistent WebSocket connection.
Streaming while the user is still speaking — rather than POSTing the whole file
after they stop — means only the final tail has to travel on stop, so the upload
finishes almost immediately. The persistent, bidirectional channel is also where
the future ML model can stream its analysis/feedback back.

Each completed attempt is written to ``settings.audio_storage_dir`` as a single
audio file plus a ``.json`` sidecar of metadata — the input seam for that model.

Protocol — control frames are JSON *text*; audio frames are *binary*:

    client → {"type": "start", "exercise": str, "target": str|null, "mime": str}
    client → <binary audio chunk>                       (repeated, 0..N)
    client → {"type": "end", "durationMs": int}
    server → {"type": "ack", "id": str, "bytes": int}

On any protocol/size/format error the server sends
``{"type": "error", "detail": str}`` and closes the socket.

Security: a WebSocket handshake is NOT covered by CORS, so the Origin header is
checked explicitly against the configured allow-list. The stored filename is
always server-generated (a UUID) — client-supplied names never touch the path.
Total bytes are capped, and the declared mime type must be in an allow-list.
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from app.analysis import MIME_EXT, AudioValidationError, analyze_attempt
from app.config import settings

logger = logging.getLogger("languageai.attempts")

router = APIRouter(tags=["attempts"])

# Bound metadata so a malicious client can't make us hold huge strings.
_MAX_EXERCISE_LEN = 64
_MAX_TARGET_LEN = 500


def _origin_allowed(ws: WebSocket) -> bool:
    """WebSockets bypass CORS — vet the Origin header ourselves.

    A missing Origin means a non-browser client (tests, CLI tools); allow it.
    """
    origin = ws.headers.get("origin")
    return origin is None or origin in settings.cors_origin_list


async def _send_error(ws: WebSocket, detail: str) -> None:
    if ws.application_state == WebSocketState.CONNECTED:
        try:
            await ws.send_json({"type": "error", "detail": detail})
        except RuntimeError:  # socket already closing
            pass


async def _send_status(ws: WebSocket, status: str) -> None:
    """Lightweight progress ping so the UI can show e.g. 'Analyzing…'."""
    if ws.application_state == WebSocketState.CONNECTED:
        try:
            await ws.send_json({"type": "status", "status": status})
        except RuntimeError:
            pass


@router.websocket("/attempts/ws")
async def attempts_ws(ws: WebSocket) -> None:
    """Receive one streamed audio attempt and persist it for later analysis."""
    if not _origin_allowed(ws):
        await ws.close(code=1008)  # policy violation
        logger.warning("attempt rejected: disallowed origin %r", ws.headers.get("origin"))
        return

    await ws.accept()

    storage = Path(settings.audio_storage_dir)
    storage.mkdir(parents=True, exist_ok=True)

    attempt_id = uuid.uuid4().hex
    meta: dict | None = None
    path: Path | None = None
    fh = None  # open file handle once we know the format
    total = 0

    try:
        while True:
            event = await ws.receive()
            if event["type"] == "websocket.disconnect":
                break

            text = event.get("text")
            data = event.get("bytes")

            if text is not None:
                try:
                    msg = json.loads(text)
                except json.JSONDecodeError:
                    await _send_error(ws, "Malformed control frame")
                    await ws.close(code=1003)
                    return
                kind = msg.get("type")

                if kind == "start":
                    mime = str(msg.get("mime") or "audio/webm").split(";")[0].strip().lower()
                    ext = MIME_EXT.get(mime)
                    if ext is None:
                        await _send_error(ws, f"Unsupported audio format: {mime}")
                        await ws.close(code=1003)  # unsupported data
                        return
                    meta = {
                        "exercise": str(msg.get("exercise") or "")[:_MAX_EXERCISE_LEN],
                        "target": (str(msg["target"])[:_MAX_TARGET_LEN] if msg.get("target") else None),
                        "mime": mime,
                    }
                    path = storage / f"{attempt_id}{ext}"
                    fh = path.open("wb")
                    logger.info(
                        "attempt %s started (exercise=%s, mime=%s)",
                        attempt_id, meta["exercise"], mime,
                    )

                elif kind == "end":
                    if fh is None or path is None or meta is None:
                        await _send_error(ws, "No audio received before end")
                        await ws.close(code=1002)
                        return
                    fh.flush()
                    fh.close()
                    fh = None
                    duration_ms = max(0, int(msg.get("durationMs") or 0))
                    logger.info("attempt %s received (%d bytes, %d ms)", attempt_id, total, duration_ms)

                    # Steps 5–9: validate → convert → detect → safe feedback.
                    # Run off the event loop so a slow model won't block the socket.
                    await _send_status(ws, "analyzing")
                    try:
                        feedback = await asyncio.to_thread(
                            analyze_attempt,
                            audio=path.read_bytes(),
                            mime=meta["mime"],
                            duration_ms=duration_ms,
                            target=meta["target"],
                        )
                    except AudioValidationError as exc:
                        path.unlink(missing_ok=True)  # don't keep unusable clips
                        await _send_error(ws, str(exc))
                        await ws.close(code=1003)
                        return

                    # Persist metadata only for analysable clips — the ML seam.
                    path.with_suffix(path.suffix + ".json").write_text(
                        json.dumps({"id": attempt_id, "bytes": total, "durationMs": duration_ms, **meta})
                    )
                    await ws.send_json(
                        {"type": "feedback", "id": attempt_id, **feedback.model_dump()}
                    )
                    break

                else:
                    await _send_error(ws, "Unknown control message")

            elif data is not None:
                if fh is None:
                    await _send_error(ws, "Audio chunk before start")
                    await ws.close(code=1002)
                    return
                total += len(data)
                if total > settings.max_audio_bytes:
                    fh.close()
                    fh = None
                    if path is not None:
                        path.unlink(missing_ok=True)
                    await _send_error(ws, "Audio exceeds size limit")
                    await ws.close(code=1009)  # message too big
                    return
                fh.write(data)

    except WebSocketDisconnect:
        logger.info("attempt %s: client disconnected mid-stream", attempt_id)
    except Exception:  # noqa: BLE001 — never let a stray error crash the worker
        logger.exception("attempt %s failed", attempt_id)
        await _send_error(ws, "Server error while receiving audio")
    finally:
        if fh is not None:  # partial/aborted upload — drop the incomplete file
            fh.close()
            if path is not None:
                path.unlink(missing_ok=True)
        if ws.application_state == WebSocketState.CONNECTED:
            try:
                await ws.close()
            except RuntimeError:
                pass
