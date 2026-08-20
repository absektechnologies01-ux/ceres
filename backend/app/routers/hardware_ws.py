import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError

from app.config import settings
from app.services import esp32_client
from app.services.auth_service import decode_token

logger = logging.getLogger(__name__)

router = APIRouter(tags=["hardware"])


@router.websocket("/ws/esp32")
async def esp32_socket(websocket: WebSocket):
    """The belt controller connects here (it dials out to us, rather than
    us dialing into it, since it sits behind a hotspot's NAT). Messages it
    sends (PAPER_DETECTED) are relayed to whichever phone is on /ws/app."""
    token = websocket.query_params.get("token")
    if token != settings.ESP32_SHARED_SECRET:
        await websocket.close(code=4401)
        return

    await websocket.accept()
    esp32_client.register_esp32(websocket)
    logger.info("ESP32 belt controller connected")
    try:
        while True:
            message = await websocket.receive_text()
            app_ws = esp32_client.get_app_ws()
            if app_ws is not None:
                try:
                    await app_ws.send_text(message)
                except Exception as exc:
                    logger.warning("Could not relay to app: %s", exc)
    except WebSocketDisconnect:
        pass
    finally:
        esp32_client.unregister_esp32(websocket)
        logger.info("ESP32 belt controller disconnected")


@router.websocket("/ws/app")
async def app_socket(websocket: WebSocket):
    """The scanner-operator phone connects here instead of dialing the
    ESP32 directly (same NAT problem). Messages it sends (SCAN_COMPLETE/
    SCAN_FLAGGED/SCAN_FAILED/RESUME) are relayed to the connected ESP32."""
    token = websocket.query_params.get("token")
    try:
        payload = decode_token(token) if token else None
        if not payload or not payload.get("sub"):
            raise JWTError("missing subject")
    except JWTError:
        await websocket.close(code=4401)
        return

    await websocket.accept()
    esp32_client.register_app(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            esp32_ws = esp32_client.get_esp32_ws()
            if esp32_ws is not None:
                try:
                    await esp32_ws.send_text(message)
                except Exception as exc:
                    logger.warning("Lost connection to ESP32 belt controller: %s", exc)
    except WebSocketDisconnect:
        pass
    finally:
        esp32_client.unregister_app(websocket)
