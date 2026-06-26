"""
OCR module (Chandra integration).

Note: `extract_ocr()` in app/services/ocr_service.py is never wired into any
HTTP router in this codebase -- there is no "OCR endpoint" to hit over
HTTP. These tests call the service function directly, mocking the Chandra
HTTP call, since that's the only real integration point that exists.
"""
import asyncio

import httpx
import pytest

from app.services.ocr_service import extract_ocr
from tests.conftest import login, auth_header


class _FakeResponse:
    def __init__(self, status_code, json_data):
        self.status_code = status_code
        self._json_data = json_data

    def json(self):
        return self._json_data

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError(
                f"status {self.status_code}", request=None, response=self
            )


class _FakeAsyncClient:
    def __init__(self, response):
        self._response = response

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, json):
        return self._response


def test_tc23_valid_image_returns_nonempty_ocr_text(monkeypatch):
    fake_response = _FakeResponse(200, {"text": "The quick brown fox", "metadata": {}})
    monkeypatch.setattr(
        "app.services.ocr_service.httpx.AsyncClient",
        lambda timeout: _FakeAsyncClient(fake_response),
    )

    result = asyncio.run(extract_ocr("https://example.com/script.jpg"))

    assert isinstance(result["text"], str)
    assert len(result["text"]) > 0


def test_tc24_response_includes_word_level_confidence_array(monkeypatch):
    confidences = [
        {"word": "The", "confidence": 0.98},
        {"word": "quick", "confidence": 0.95},
    ]
    fake_response = _FakeResponse(200, {"text": "The quick", "metadata": {"words": confidences}})
    monkeypatch.setattr(
        "app.services.ocr_service.httpx.AsyncClient",
        lambda timeout: _FakeAsyncClient(fake_response),
    )

    result = asyncio.run(extract_ocr("https://example.com/script.jpg"))

    assert isinstance(result["metadata"]["words"], list)
    assert result["metadata"]["words"] == confidences


def test_tc25_corrupt_image_returns_handled_error_not_unhandled_exception(monkeypatch):
    """KNOWN GAP vs the test plan: extract_ocr() has no try/except around
    `response.raise_for_status()`. A non-2xx response (e.g. from a corrupt
    image) should be converted into a clean, identifiable error (here:
    ValueError) rather than letting the raw httpx transport exception
    escape. This test expects that handled behavior and is expected to
    fail against current code -- it is intentionally not softened to force
    a false pass."""
    fake_response = _FakeResponse(400, {"error": "corrupt image"})
    monkeypatch.setattr(
        "app.services.ocr_service.httpx.AsyncClient",
        lambda timeout: _FakeAsyncClient(fake_response),
    )

    with pytest.raises(ValueError):
        asyncio.run(extract_ocr("https://example.com/corrupt.jpg"))


def test_tc26_ocr_text_persisted_to_sheet_record(client, db_session, marking_context):
    operator = marking_context["operator"]
    session = marking_context["session"]
    token = login(client, operator.email)

    resp = client.post(
        f"/sessions/{session.id}/sheets",
        json={
            "image_url": "https://ik.imagekit.io/x2uo7omcw/sheets/ocr-test.jpg",
            "ocr_text": "Q1: The mitochondria is the powerhouse of the cell.",
            "ocr_metadata": None,
            "upload_order": 50,
        },
        headers=auth_header(token),
    )
    assert resp.status_code == 201
    sheet_id = resp.json()["id"]

    from app.models.submission import Sheet
    persisted = db_session.query(Sheet).filter(Sheet.id == sheet_id).first()
    assert persisted is not None
    assert persisted.ocr_text == "Q1: The mitochondria is the powerhouse of the cell."
