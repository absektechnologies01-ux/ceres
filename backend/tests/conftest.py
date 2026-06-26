import os
import uuid

# Must happen before any `app.*` import: app.config.Settings() reads DATABASE_URL
# at import time, and app.database creates its engine from that value immediately.
os.environ["DATABASE_URL"] = "postgresql://asante@localhost:5432/ceres_test"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.database import Base, engine, get_db
from app.main import app
from app.models.user import User, UserRole
from app.models.institution import School, Faculty, Department, Class, Course, TeacherAssignment
from app.models.session import ScanSession, SessionStatus
from app.models.submission import Submission, SubmissionStatus
from app.models.marking import MarkingScheme
from app.services.auth_service import hash_password

TestingSessionLocal = sessionmaker(bind=engine)


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session():
    """One Postgres transaction per test; rolled back at teardown so tests never
    persist data into ceres_test and never touch the real `ceres` dev database."""
    connection = engine.connect()
    trans = connection.begin()
    session = TestingSessionLocal(bind=connection, join_transaction_mode="create_savepoint")
    yield session
    session.close()
    trans.rollback()
    connection.close()


@pytest.fixture()
def client(db_session):
    def _override_get_db():
        try:
            yield db_session
        finally:
            db_session.rollback()

    app.dependency_overrides[get_db] = _override_get_db
    # raise_server_exceptions=False so an unhandled exception in the app surfaces
    # as a real HTTP 500 response, matching what a deployed server would return.
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


def make_user(db_session, role: UserRole, email: str | None = None, password: str = "Password123!") -> User:
    user = User(
        name=f"{role.value} user",
        email=email or f"{role.value}-{uuid.uuid4().hex[:8]}@example.com",
        role=role,
        hashed_password=hash_password(password),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def login(client, email: str, password: str = "Password123!") -> str:
    resp = client.post("/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def marking_context(db_session):
    """Builds the full FK chain needed for a markable submission:
    school -> faculty -> department -> class/course -> teacher assignment ->
    scan session -> marking scheme -> submission.
    """
    school = School(name="Test School")
    db_session.add(school)
    db_session.flush()

    faculty = Faculty(name="Test Faculty", school_id=school.id)
    db_session.add(faculty)
    db_session.flush()

    department = Department(name="Test Dept", faculty_id=faculty.id)
    db_session.add(department)
    db_session.flush()

    klass = Class(name="Test Class", department_id=department.id, academic_year="2025/2026")
    course = Course(code="CS101", name="Intro to CS", department_id=department.id)
    db_session.add_all([klass, course])
    db_session.flush()

    teacher = make_user(db_session, UserRole.teacher)
    operator = make_user(db_session, UserRole.scanner_operator)

    assignment = TeacherAssignment(teacher_id=teacher.id, class_id=klass.id, course_id=course.id)
    db_session.add(assignment)

    session = ScanSession(
        operator_id=operator.id,
        class_id=klass.id,
        course_id=course.id,
        status=SessionStatus.active,
    )
    db_session.add(session)
    db_session.flush()

    scheme = MarkingScheme(
        session_id=session.id,
        teacher_id=teacher.id,
        original_file_url="https://example.com/scheme.pdf",
        questions=[
            {"question_number": "1", "max_marks": 10, "label_variants": ["Q1"]},
            {"question_number": "2", "max_marks": 5, "label_variants": ["Q2"]},
        ],
    )
    db_session.add(scheme)

    submission = Submission(session_id=session.id, student_id="STU001", status=SubmissionStatus.pending)
    db_session.add(submission)
    db_session.commit()

    return {
        "teacher": teacher,
        "operator": operator,
        "session": session,
        "scheme": scheme,
        "submission": submission,
    }
