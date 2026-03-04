from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.dependencies import require_role, get_current_user
from app.models.user import User, UserRole
from app.models.session import ScanSession
from app.models.marking import MarkingScheme
from app.models.institution import TeacherAssignment
from app.schemas.marking import SchemeOut
from app.services.scheme_parser_service import parse_scheme_file
from app.services.imagekit_service import upload_scheme_file

router = APIRouter(tags=["schemes"])


def _get_session_or_404(session_id: uuid.UUID, db: Session) -> ScanSession:
    session = db.query(ScanSession).filter(ScanSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def _check_teacher_access(session: ScanSession, user: User, db: Session):
    assignment = db.query(TeacherAssignment).filter(
        TeacherAssignment.teacher_id == user.id,
        TeacherAssignment.class_id == session.class_id,
        TeacherAssignment.course_id == session.course_id,
    ).first()
    if not assignment:
        raise HTTPException(status_code=403, detail="You are not assigned to this session")


@router.post("/sessions/{session_id}/scheme", response_model=SchemeOut, status_code=status.HTTP_201_CREATED)
async def upload_scheme(
    session_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.teacher)),
):
    session = _get_session_or_404(session_id, db)
    _check_teacher_access(session, current_user, db)

    filename = file.filename or "scheme"
    if not filename.lower().endswith((".pdf", ".docx", ".doc")):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")

    content = await file.read()

    # Parse questions
    questions = parse_scheme_file(content, filename)
    if not questions:
        raise HTTPException(
            status_code=422,
            detail=(
                "Could not parse questions from this document. "
                "Please ensure questions are labelled as Q1, Question 1, etc. "
                "with marks in parentheses e.g. (10 marks)"
            ),
        )

    # Upload original file to ImageKit
    try:
        file_url = upload_scheme_file(content, filename)
    except Exception:
        file_url = f"local://{filename}"  # Fallback if ImageKit not configured

    # Check if scheme already exists for this session
    existing = db.query(MarkingScheme).filter(MarkingScheme.session_id == session_id).first()
    if existing:
        # Replace existing scheme
        existing.original_file_url = file_url
        existing.questions = questions
        existing.teacher_id = current_user.id
        db.commit()
        db.refresh(existing)
        return existing

    scheme = MarkingScheme(
        session_id=session_id,
        teacher_id=current_user.id,
        original_file_url=file_url,
        questions=questions,
    )
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    return scheme


@router.get("/sessions/{session_id}/scheme", response_model=SchemeOut)
def get_scheme(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_session_or_404(session_id, db)
    if current_user.role == UserRole.teacher:
        _check_teacher_access(session, current_user, db)

    scheme = db.query(MarkingScheme).filter(MarkingScheme.session_id == session_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="No marking scheme uploaded for this session")
    return scheme
