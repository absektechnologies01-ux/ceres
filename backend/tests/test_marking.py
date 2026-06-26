"""
Marking module.

Note: TC34 ("audit log entry created on mark submission") is intentionally
skipped, not faked. The only audit-adjacent table in this codebase is
`MarkingReview`, which records admin approve/reject decisions on a whole
session -- it is not created or touched by `PUT /submissions/{id}/scores`.
There is no mechanism in the current code that creates an audit row on
mark submission, so there is nothing real to assert here.

Note: there is no single "mark_id" in the response for TC31 -- submitting
scores returns a list of QuestionScoreOut rows, each with its own `id`.
That's tested as the closest real equivalent.
"""
import pytest

from tests.conftest import login, auth_header


def test_tc31_submit_valid_mark_record_returns_score_ids(client, db_session, marking_context):
    teacher = marking_context["teacher"]
    submission = marking_context["submission"]
    token = login(client, teacher.email)

    resp = client.put(
        f"/submissions/{submission.id}/scores",
        json=[
            {"question_number": "1", "awarded_marks": 7, "max_marks": 10, "comment": None},
            {"question_number": "2", "awarded_marks": 3, "max_marks": 5, "comment": None},
        ],
        headers=auth_header(token),
    )

    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 2
    for score in body:
        assert score["id"]


def test_tc32_submitted_total_matches_sum_of_question_marks(client, db_session, marking_context):
    teacher = marking_context["teacher"]
    submission = marking_context["submission"]
    token = login(client, teacher.email)

    resp = client.put(
        f"/submissions/{submission.id}/scores",
        json=[
            {"question_number": "1", "awarded_marks": 7, "max_marks": 10, "comment": None},
            {"question_number": "2", "awarded_marks": 3, "max_marks": 5, "comment": None},
        ],
        headers=auth_header(token),
    )
    assert resp.status_code == 200

    get_resp = client.get(f"/submissions/{submission.id}", headers=auth_header(token))
    assert get_resp.status_code == 200
    assert get_resp.json()["total_score"] == pytest.approx(10.0)


@pytest.mark.skip(reason="No audit-on-mark-submission mechanism exists in this codebase (only MarkingReview, an unrelated admin approval table) -- nothing real to assert for TC34.")
def test_tc34_audit_log_entry_created_on_mark_submission():
    pass


def test_tc38_scanner_operator_denied_mark_submission_endpoint(client, db_session, marking_context):
    operator = marking_context["operator"]
    submission = marking_context["submission"]
    token = login(client, operator.email)

    resp = client.put(
        f"/submissions/{submission.id}/scores",
        json=[{"question_number": "1", "awarded_marks": 5, "max_marks": 10, "comment": None}],
        headers=auth_header(token),
    )

    assert resp.status_code == 403


def test_tc41_full_marks_scenario_total_equals_max_mark(client, db_session, marking_context):
    teacher = marking_context["teacher"]
    submission = marking_context["submission"]
    token = login(client, teacher.email)

    resp = client.put(
        f"/submissions/{submission.id}/scores",
        json=[
            {"question_number": "1", "awarded_marks": 10, "max_marks": 10, "comment": None},
            {"question_number": "2", "awarded_marks": 5, "max_marks": 5, "comment": None},
        ],
        headers=auth_header(token),
    )
    assert resp.status_code == 200

    get_resp = client.get(f"/submissions/{submission.id}", headers=auth_header(token))
    assert get_resp.json()["total_score"] == pytest.approx(15.0)
    assert get_resp.json()["status"] == "marked"


def test_tc42_zero_mark_scenario_total_equals_zero(client, db_session, marking_context):
    teacher = marking_context["teacher"]
    submission = marking_context["submission"]
    token = login(client, teacher.email)

    resp = client.put(
        f"/submissions/{submission.id}/scores",
        json=[
            {"question_number": "1", "awarded_marks": 0, "max_marks": 10, "comment": None},
            {"question_number": "2", "awarded_marks": 0, "max_marks": 5, "comment": None},
        ],
        headers=auth_header(token),
    )
    assert resp.status_code == 200

    get_resp = client.get(f"/submissions/{submission.id}", headers=auth_header(token))
    assert get_resp.json()["total_score"] == pytest.approx(0.0)
