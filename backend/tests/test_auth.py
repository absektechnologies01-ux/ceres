"""
Authentication module.

Note: the test plan refers to a "moderator" role being denied the mark
submission endpoint (TC05/TC38). This codebase only defines three roles
(admin, teacher, scanner_operator) -- there is no moderator. Per product
decision, these are tested against `scanner_operator`, the real role that
the marking endpoints actually reject.
"""
from datetime import datetime, timedelta

from jose import jwt

from app.config import settings
from app.models.user import UserRole
from app.dependencies import require_role
from app.services.auth_service import hash_password, verify_password
from fastapi import HTTPException

from tests.conftest import make_user, login, auth_header


def test_tc01_login_with_valid_credentials_returns_jwt(client, db_session):
    make_user(db_session, UserRole.teacher, email="tc01@example.com", password="Password123!")

    resp = client.post("/auth/login", data={"username": "tc01@example.com", "password": "Password123!"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"


def test_tc02_login_with_wrong_password_returns_401(client, db_session):
    make_user(db_session, UserRole.teacher, email="tc02@example.com", password="Password123!")

    resp = client.post("/auth/login", data={"username": "tc02@example.com", "password": "WrongPassword!"})

    assert resp.status_code == 401
    assert "detail" in resp.json()


def test_tc04_expired_jwt_rejected_on_protected_endpoint(client, db_session):
    operator = make_user(db_session, UserRole.scanner_operator, email="tc04@example.com")
    expired_token = jwt.encode(
        {
            "sub": str(operator.id),
            "role": operator.role,
            "type": "access",
            "exp": datetime.utcnow() - timedelta(minutes=5),
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    resp = client.get("/sessions", headers=auth_header(expired_token))

    assert resp.status_code == 401


def test_tc05_non_teacher_role_denied_by_require_role_dependency(db_session):
    """Unit-level check on the role-gating dependency itself: a scanner_operator
    (the real-world stand-in for "moderator") is rejected before reaching any
    endpoint logic."""
    scanner_operator = make_user(db_session, UserRole.scanner_operator, email="tc05@example.com")
    checker = require_role(UserRole.teacher)

    try:
        checker(current_user=scanner_operator)
        assert False, "expected HTTPException to be raised"
    except HTTPException as exc:
        assert exc.status_code == 403


def test_tc09_password_stored_as_bcrypt_hash_not_plaintext(db_session):
    plaintext = "Password123!"
    user = make_user(db_session, UserRole.teacher, email="tc09@example.com", password=plaintext)

    db_session.refresh(user)

    assert user.hashed_password != plaintext
    assert user.hashed_password.startswith("$2b$")
    assert verify_password(plaintext, user.hashed_password) is True
    assert verify_password("wrong-password", user.hashed_password) is False
