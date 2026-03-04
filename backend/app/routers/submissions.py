from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserRole
from app.models.session import ScanSession
from app.models.submission import Submission, Sheet
from app.models.marking import MarkingScheme
from app.models.institution import TeacherAssignment
from app.schemas.submission import SubmissionOut, SubmissionQuestion
from app.utils.question_detector import detect_questions

router = APIRouter(tags=["submissions"])


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
        raise HTTPException(status_code=403, detail="You are not assigned to this session's class and course")


@router.get("/sessions/{session_id}/submissions", response_model=List[SubmissionOut])
def list_submissions(
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
    return db.query(Submission).filter(Submission.session_id == session_id).all()


@router.get("/submissions/{submission_id}", response_model=SubmissionOut)
def get_submission(
    submission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    session = _get_session_or_404(submission.session_id, db)
    if current_user.role == UserRole.teacher:
        _check_teacher_access(session, current_user, db)
    elif current_user.role == UserRole.scanner_operator:
        if session.operator_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    return submission


@router.get("/submissions/{submission_id}/questions", response_model=List[SubmissionQuestion])
def get_submission_questions(
    submission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Merged question list from all sheets, matched against the marking scheme.
    Questions from scheme not found in student script are included with a 'not found' flag.
    """
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    session = _get_session_or_404(submission.session_id, db)
    if current_user.role == UserRole.teacher:
        _check_teacher_access(session, current_user, db)

    # Get marking scheme
    scheme = db.query(MarkingScheme).filter(MarkingScheme.session_id == submission.session_id).first()
    scheme_questions = scheme.questions if scheme else []

    # Detect questions from all sheets
    detected: dict[str, dict] = {}
    for sheet in submission.sheets:
        if sheet.ocr_text:
            found = detect_questions(sheet.ocr_text, sheet.ocr_metadata or {})
            for q in found:
                qnum = q["question_number"]
                if qnum not in detected:
                    detected[qnum] = {**q, "sheet_id": str(sheet.id)}

    # Get existing scores
    score_map: dict[str, tuple] = {}
    for score in submission.scores:
        score_map[score.question_number] = (score.awarded_marks, score.comment)

    # Build merged list from scheme
    result: List[SubmissionQuestion] = []
    for sq in scheme_questions:
        qnum = str(sq["question_number"])
        det = detected.get(qnum)
        awarded, comment = score_map.get(qnum, (None, None))
        result.append(SubmissionQuestion(
            question_number=qnum,
            label=sq.get("label_variants", [f"Q{qnum}"])[0],
            question_text=sq.get("question_text") or None,
            text_content=det["text_content"] if det else "No answer found for this question.",
            max_marks=float(sq.get("max_marks", 0)),
            expected_answer=sq.get("expected_answer", ""),
            awarded_marks=awarded,
            comment=comment,
            sheet_id=det["sheet_id"] if det else None,
        ))

    return result
