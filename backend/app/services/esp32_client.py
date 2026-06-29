import logging
import threading

import websocket

from app.config import settings

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_ws: websocket.WebSocket | None = None


def _get_connection() -> "websocket.WebSocket | None":
    """Returns the live connection to the belt controller, reconnecting if needed."""
    global _ws
    if not settings.ESP32_WS_URL:
        return None
    if _ws is not None:
        return _ws
    try:
        _ws = websocket.create_connection(settings.ESP32_WS_URL, timeout=2)
        logger.info("Connected to ESP32 belt controller at %s", settings.ESP32_WS_URL)
    except OSError as exc:
        logger.warning("Could not reach ESP32 belt controller: %s", exc)
        return None
    return _ws


def connect() -> None:
    """Best-effort initial connection, called on app startup so the belt
    controller sees a connected app before the first sheet ever arrives."""
    with _lock:
        _get_connection()


def send_scan_result(message: str) -> None:
    """Notifies the belt controller of a sheet outcome (SCAN_COMPLETE,
    SCAN_FLAGGED, SCAN_FAILED). Best-effort: a missing/unreachable ESP32
    must never break the sheet-upload response, so all errors are logged
    and swallowed here rather than raised."""
    global _ws
    with _lock:
        ws = _get_connection()
        if ws is None:
            return
        try:
            ws.send(message)
        except OSError as exc:
            logger.warning("Lost connection to ESP32 belt controller: %s", exc)
            try:
                ws.close()
            except OSError:
                pass
            _ws = None
