from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import uuid

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.session import ScanSession, SessionStatus
from app.models.submission import Sheet, Submission
from app.models.marking import MarkingScheme
from app.models.institution import TeacherAssignment
from app.schemas.session import SessionCreate, SessionOut, SheetCreate, SheetResolve
from app.schemas.submission import SheetOut
from app.services.grouping_service import process_sheet_and_group

router = APIRouter(tags=["sessions"])

operator_only = require_role(UserRole.scanner_operator)


def _enrich_sessions(sessions: list, db: Session) -> List[SessionOut]:
    """Attach submission_count and has_scheme to a list of ScanSession objects."""
    if not sessions:
        return []
    ids = [s.id for s in sessions]
    counts = {
        row.session_id: row.count
        for row in db.query(Submission.session_id, func.count(Submission.id).label("count"))
        .filter(Submission.session_id.in_(ids))
        .group_by(Submission.session_id)
        .all()
    }
    scheme_ids = {
        row.session_id
        for row in db.query(MarkingScheme.session_id)
        .filter(MarkingScheme.session_id.in_(ids))
        .all()
    }
    result = []
    for s in sessions:
        out = SessionOut.model_validate(s)
        out.submission_count = counts.get(s.id, 0)
        out.has_scheme = s.id in scheme_ids
        result.append(out)
    return result


def _get_session_or_404(session_id: uuid.UUID, db: Session) -> ScanSession:
    session = db.query(ScanSession).filter(ScanSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def _check_teacher_access(session: ScanSession, user: User, db: Session):
    """Verify teacher is assigned to this session's class+course."""
    assignment = db.query(TeacherAssignment).filter(
        TeacherAssignment.teacher_id == user.id,
        TeacherAssignment.class_id == session.class_id,
        TeacherAssignment.course_id == session.course_id,
    ).first()
    if not assignment:
        raise HTTPException(status_code=403, detail="You are not assigned to this session's class and course")


# ─── Session CRUD ─────────────────────────────────────────────────────────────

@router.post("/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    body: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(operator_only),
):
    session = ScanSession(
        operator_id=current_user.id,
        class_id=body.class_id,
        course_id=body.course_id,
        status=SessionStatus.active,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions", response_model=List[SessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(operator_only),
):
    return db.query(ScanSession).filter(ScanSession.operator_id == current_user.id).all()


@router.get("/sessions/all", response_model=List[SessionOut])
def list_all_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin can see all sessions; teachers see sessions for their assignments."""
    if current_user.role == UserRole.admin:
        sessions = db.query(ScanSession).order_by(ScanSession.created_at.desc()).all()
    else:
        assignments = db.query(TeacherAssignment).filter(
            TeacherAssignment.teacher_id == current_user.id
        ).all()
        if not assignments:
            return []
        class_ids = [a.class_id for a in assignments]
        course_ids = [a.course_id for a in assignments]
        sessions = db.query(ScanSession).filter(
            ScanSession.class_id.in_(class_ids),
            ScanSession.course_id.in_(course_ids),
        ).order_by(ScanSession.created_at.desc()).all()
    return _enrich_sessions(sessions, db)


@router.get("/sessions/{session_id}", response_model=SessionOut)
def get_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_session_or_404(session_id, db)
    if current_user.role == UserRole.teacher:
        _check_teacher_access(session, current_user, db)
    elif current_user.role == UserRole.scanner_operator:
        if session.operator_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    return session


@router.put("/sessions/{session_id}/close", response_model=SessionOut)
def close_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(operator_only),
):
    session = _get_session_or_404(session_id, db)
    if session.operator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if session.status == SessionStatus.closed:
        raise HTTPException(status_code=400, detail="Session is already closed")
    session.status = SessionStatus.closed
    db.commit()
    db.refresh(session)
    return session


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_session_or_404(session_id, db)
    if current_user.role == UserRole.teacher:
        _check_teacher_access(session, current_user, db)
    elif current_user.role == UserRole.scanner_operator:
        if session.operator_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    # Cascade-delete in FK order: scores → sheets → submissions → scheme → session
    from app.models.marking import MarkingScheme, QuestionScore
    submission_ids = [s.id for s in db.query(Submission.id).filter(Submission.session_id == session_id).all()]
    if submission_ids:
        db.query(QuestionScore).filter(QuestionScore.submission_id.in_(submission_ids)).delete(synchronize_session=False)
    db.query(Sheet).filter(Sheet.session_id == session_id).delete(synchronize_session=False)
    db.query(Submission).filter(Submission.session_id == session_id).delete(synchronize_session=False)
    db.query(MarkingScheme).filter(MarkingScheme.session_id == session_id).delete(synchronize_session=False)
    db.delete(session)
    db.commit()


# ─── Sheets ───────────────────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/sheets", response_model=SheetOut, status_code=status.HTTP_201_CREATED)
def upload_sheet(
    session_id: uuid.UUID,
    body: SheetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(operator_only),
):
    session = _get_session_or_404(session_id, db)
    if session.operator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if session.status == SessionStatus.closed:
        raise HTTPException(status_code=400, detail="Cannot upload to a closed session")

    sheet = Sheet(
        session_id=session_id,
        image_url=body.image_url,
        ocr_text=body.ocr_text,
        ocr_metadata=body.ocr_metadata,
        upload_order=body.upload_order,
        flagged=False,
    )
    db.add(sheet)
    db.flush()

    # Trigger grouping service
    sheet = process_sheet_and_group(sheet, db)
    db.refresh(sheet)
    return sheet


@router.get("/sessions/{session_id}/sheets", response_model=List[SheetOut])
def list_sheets(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_session_or_404(session_id, db)
    if current_user.role == UserRole.teacher:
        _check_teacher_access(session, current_user, db)
    elif current_user.role == UserRole.scanner_operator:
        if session.operator_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    return db.query(Sheet).filter(Sheet.session_id == session_id).order_by(Sheet.upload_order).all()


@router.get("/sessions/{session_id}/sheets/flagged", response_model=List[SheetOut])
def list_flagged_sheets(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_session_or_404(session_id, db)
    if current_user.role == UserRole.scanner_operator:
        if session.operator_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == UserRole.teacher:
        _check_teacher_access(session, current_user, db)
    return db.query(Sheet).filter(
        Sheet.session_id == session_id,
        Sheet.flagged == True,
    ).order_by(Sheet.upload_order).all()


@router.put("/sessions/{session_id}/sheets/{sheet_id}/resolve", response_model=SheetOut)
def resolve_sheet(
    session_id: uuid.UUID,
    sheet_id: uuid.UUID,
    body: SheetResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_session_or_404(session_id, db)
    if current_user.role == UserRole.scanner_operator:
        if session.operator_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == UserRole.teacher:
        _check_teacher_access(session, current_user, db)

    sheet = db.query(Sheet).filter(Sheet.id == sheet_id, Sheet.session_id == session_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")

    # Override OCR result with manually confirmed ID
    sheet.student_id_confirmed = body.student_id_confirmed
    sheet.id_confidence = 1.0
    sheet.flagged = False

    # Re-trigger grouping with the confirmed ID
    sheet = process_sheet_and_group(sheet, db)
    db.refresh(sheet)
    return sheet
