"""
Script Management module.

Note: the live API does not accept a raw multipart image upload -- scripts
are uploaded to ImageKit by the client first, then POSTed to
`/sessions/{session_id}/sheets` as a JSON body containing `image_url` (a
string). "Upload valid JPEG" (TC11) is tested against that real contract:
a sheet record referencing an image URL, not raw file bytes.
"""
import uuid

from app.models.submission import Sheet
from tests.conftest import login, auth_header


def test_tc11_create_sheet_returns_id_and_url(client, db_session, marking_context):
    operator = marking_context["operator"]
    session = marking_context["session"]
    token = login(client, operator.email)

    resp = client.post(
        f"/sessions/{session.id}/sheets",
        json={
            "image_url": "https://ik.imagekit.io/x2uo7omcw/sheets/script1.jpg",
            "ocr_text": None,
            "ocr_metadata": None,
            "upload_order": 1,
        },
        headers=auth_header(token),
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["id"]
    assert body["image_url"] == "https://ik.imagekit.io/x2uo7omcw/sheets/script1.jpg"


def test_tc14_get_submission_with_nonexistent_id_returns_404(client, db_session, marking_context):
    operator = marking_context["operator"]
    token = login(client, operator.email)

    resp = client.get(f"/submissions/{uuid.uuid4()}", headers=auth_header(token))

    assert resp.status_code == 404


def test_tc18_db_write_failure_triggers_rollback_no_orphan_sheet(client, db_session, marking_context, monkeypatch):
    """Simulates a downstream DB failure after the sheet INSERT has been
    flushed but before it is committed, and asserts the failed request
    leaves no orphan Sheet row behind."""
    operator = marking_context["operator"]
    session = marking_context["session"]
    token = login(client, operator.email)

    def _boom(sheet, db):
        raise RuntimeError("simulated DB failure")

    monkeypatch.setattr("app.routers.sessions.process_sheet_and_group", _boom)

    resp = client.post(
        f"/sessions/{session.id}/sheets",
        json={
            "image_url": "https://ik.imagekit.io/x2uo7omcw/sheets/corrupt-write.jpg",
            "ocr_text": None,
            "ocr_metadata": None,
            "upload_order": 99,
        },
        headers=auth_header(token),
    )

    assert resp.status_code == 500

    orphan = db_session.query(Sheet).filter(
        Sheet.session_id == session.id,
        Sheet.upload_order == 99,
    ).first()
    assert orphan is None


def test_tc20_sequential_uploads_yield_distinct_ids(client, db_session, marking_context):
    """Five uploads in immediate succession (exercising the same uuid4
    ID-generation path concurrent uploads would hit) must yield five
    distinct sheet IDs."""
    operator = marking_context["operator"]
    session = marking_context["session"]
    token = login(client, operator.email)

    ids = []
    for i in range(5):
        resp = client.post(
            f"/sessions/{session.id}/sheets",
            json={
                "image_url": f"https://ik.imagekit.io/x2uo7omcw/sheets/script{i}.jpg",
                "ocr_text": None,
                "ocr_metadata": None,
                "upload_order": 100 + i,
            },
            headers=auth_header(token),
        )
        assert resp.status_code == 201
        ids.append(resp.json()["id"])

    assert len(ids) == 5
    assert len(set(ids)) == 5
