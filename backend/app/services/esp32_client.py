import asyncio
import logging
import threading

from starlette.websockets import WebSocket

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_loop: asyncio.AbstractEventLoop | None = None
_esp32_ws: WebSocket | None = None
_app_ws: WebSocket | None = None


def set_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Captured once at startup so send_scan_result (called from sync HTTP
    handlers running in FastAPI's threadpool) can bridge onto it."""
    global _loop
    _loop = loop


def register_esp32(ws: WebSocket) -> None:
    global _esp32_ws
    with _lock:
        _esp32_ws = ws


def unregister_esp32(ws: WebSocket) -> None:
    global _esp32_ws
    with _lock:
        if _esp32_ws is ws:
            _esp32_ws = None


def register_app(ws: WebSocket) -> None:
    global _app_ws
    with _lock:
        _app_ws = ws


def unregister_app(ws: WebSocket) -> None:
    global _app_ws
    with _lock:
        if _app_ws is ws:
            _app_ws = None


def get_esp32_ws() -> WebSocket | None:
    with _lock:
        return _esp32_ws


def get_app_ws() -> WebSocket | None:
    with _lock:
        return _app_ws


def send_scan_result(message: str) -> None:
    """Notifies the belt controller of a sheet outcome (SCAN_COMPLETE,
    SCAN_FLAGGED, SCAN_FAILED). Best-effort: a missing/unreachable ESP32
    must never break the sheet-upload response, so all errors are logged
    and swallowed here rather than raised.

    Called from sync HTTP route handlers (FastAPI's threadpool), so it
    bridges onto the main event loop rather than awaiting directly — the
    async WebSocket routes in hardware_ws.py talk to the registered sockets
    directly instead of going through this function, to avoid deadlocking
    a thread that's already running the event loop.
    """
    ws = get_esp32_ws()
    if ws is None or _loop is None:
        return
    try:
        asyncio.run_coroutine_threadsafe(ws.send_text(message), _loop).result(timeout=2)
    except Exception as exc:
        logger.warning("Lost connection to ESP32 belt controller: %s", exc)
