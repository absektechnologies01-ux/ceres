import io
import json
import socket

import qrcode
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from app.routers import auth, admin, sessions, submissions, marking, schemes, institution, audit
from app.config import settings
from app.database import engine
from app import models
from app.services import esp32_client

# Create all tables (dev only — use Alembic in production)
models.user.Base.metadata.create_all(bind=engine)
models.institution.Base.metadata.create_all(bind=engine)
models.session.Base.metadata.create_all(bind=engine)
models.submission.Base.metadata.create_all(bind=engine)
models.marking.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ceres API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(sessions.router)
app.include_router(submissions.router)
app.include_router(marking.router)
app.include_router(schemes.router)
app.include_router(institution.router)
app.include_router(audit.router)


@app.on_event("startup")
def connect_esp32():
    esp32_client.connect()


@app.get("/health")
def health():
    return {"status": "ok"}


def _local_lan_ip() -> str:
    """Best-effort LAN IP of this machine (no packets actually sent)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


@app.get("/pair")
def pair_qr():
    """QR code encoding this backend's current LAN address and the ESP32
    WebSocket URL, for the mobile app to scan instead of hardcoding IPs."""
    payload = {
        "api_base_url": f"http://{_local_lan_ip()}:{settings.API_PORT}",
        "esp32_ws_url": settings.ESP32_WS_URL,
    }
    img = qrcode.make(json.dumps(payload))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")
