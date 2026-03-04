from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.database import get_db
from app.dependencies import require_role, get_current_user
from app.models.user import User, UserRole
from app.models.session import ScanSession
from app.models.submission import Submission, SubmissionStatus
from app.models.marking import MarkingScheme, QuestionScore
from app.models.institution import TeacherAssignment
from app.schemas.marking import ScoreInput, CommentInput, QuestionScoreOut, SessionResult

router = APIRouter(tags=["marking"])


def _get_session_or_404(session_id: uuid.UUID, db: Session) -> ScanSession:
    session = db.query(ScanSession).filter(ScanSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def _get_submission_or_404(submission_id: uuid.UUID, db: Session) -> Submission:
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission


def _check_teacher_access(session: ScanSession, user: User, db: Session):
    assignment = db.query(TeacherAssignment).filter(
        TeacherAssignment.teacher_id == user.id,
        TeacherAssignment.class_id == session.class_id,
        TeacherAssignment.course_id == session.course_id,
    ).first()
    if not assignment:
        raise HTTPException(status_code=403, detail="You are not assigned to this session")


def _recompute_submission_score(submission: Submission, scheme_questions: list, db: Session):
    """
    Recomputes total_score and updates submission status.
    marked = all scheme questions have a score. in_progress = some do.
    """
    scores = {s.question_number: s.awarded_marks for s in submission.scores}
    scheme_q_nums = {str(q["question_number"]) for q in scheme_questions}

    total = sum(v for v in scores.values() if v is not None)
    all_scored = all(scores.get(qn) is not None for qn in scheme_q_nums) if scheme_q_nums else False

    submission.total_score = total
    if all_scored:
        submission.status = SubmissionStatus.marked
    elif any(scores.values()):
        submission.status = SubmissionStatus.in_progress
    db.commit()


# ─── Marking Overview ─────────────────────────────────────────────────────────

@router.get("/sessions/{session_id}/marking", response_model=List[dict])
def get_marking_overview(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.teacher)),
):
    session = _get_session_or_404(session_id, db)
    _check_teacher_access(session, current_user, db)

    submissions = db.query(Submission).filter(Submission.session_id == session_id).all()
    scheme = db.query(MarkingScheme).filter(MarkingScheme.session_id == session_id).first()
    scheme_questions = scheme.questions if scheme else []
    max_possible = sum(float(q.get("max_marks", 0)) for q in scheme_questions)

    result = []
    for sub in submissions:
        scored_count = sum(1 for s in sub.scores if s.awarded_marks is not None)
        result.append({
            "submission_id": str(sub.id),
            "student_id": sub.student_id,
            "status": sub.status,
            "total_score": sub.total_score,
            "max_possible": max_possible,
            "scored_questions": scored_count,
            "total_questions": len(scheme_questions),
        })
    return result


# ─── Scores ───────────────────────────────────────────────────────────────────

@router.get("/submissions/{submission_id}/scores", response_model=List[QuestionScoreOut])
def get_scores(
    submission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = _get_submission_or_404(submission_id, db)
    session = _get_session_or_404(submission.session_id, db)
    if current_user.role == UserRole.teacher:
        _check_teacher_access(session, current_user, db)
    return submission.scores


@router.put("/submissions/{submission_id}/scores", response_model=List[QuestionScoreOut])
def upsert_scores(
    submission_id: uuid.UUID,
    body: List[ScoreInput],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.teacher)),
):
    """Batch upsert scores. Creates or updates QuestionScore rows."""
    submission = _get_submission_or_404(submission_id, db)
    session = _get_session_or_404(submission.session_id, db)
    _check_teacher_access(session, current_user, db)

    for item in body:
        score = db.query(QuestionScore).filter(
            QuestionScore.submission_id == submission_id,
            QuestionScore.question_number == item.question_number,
        ).first()

        if score:
            score.awarded_marks = item.awarded_marks
            score.max_marks = item.max_marks
            if item.comment is not None:
                score.comment = item.comment
        else:
            score = QuestionScore(
                submission_id=submission_id,
                question_number=item.question_number,
                awarded_marks=item.awarded_marks,
                max_marks=item.max_marks,
                comment=item.comment,
                teacher_id=current_user.id,
            )
            db.add(score)

    db.flush()

    # Recompute total score
    scheme = db.query(MarkingScheme).filter(MarkingScheme.session_id == submission.session_id).first()
    _recompute_submission_score(submission, scheme.questions if scheme else [], db)
    db.refresh(submission)

    return submission.scores


@router.put("/submissions/{submission_id}/scores/{question_number}/comment", response_model=QuestionScoreOut)
def update_comment(
    submission_id: uuid.UUID,
    question_number: str,
    body: CommentInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.teacher)),
):
    """Update only the comment for a specific question without changing the score."""
    submission = _get_submission_or_404(submission_id, db)
    session = _get_session_or_404(submission.session_id, db)
    _check_teacher_access(session, current_user, db)

    score = db.query(QuestionScore).filter(
        QuestionScore.submission_id == submission_id,
        QuestionScore.question_number == question_number,
    ).first()

    if not score:
        raise HTTPException(
            status_code=404,
            detail="Score not found for this question. Save a score first before adding a comment.",
        )

    score.comment = body.comment
    db.commit()
    db.refresh(score)
    return score


# ─── Results ──────────────────────────────────────────────────────────────────

@router.get("/sessions/{session_id}/results", response_model=List[SessionResult])
def get_session_results(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.teacher)),
):
    session = _get_session_or_404(session_id, db)
    _check_teacher_access(session, current_user, db)

    submissions = db.query(Submission).filter(Submission.session_id == session_id).all()
    scheme = db.query(MarkingScheme).filter(MarkingScheme.session_id == session_id).first()
    max_possible = sum(float(q.get("max_marks", 0)) for q in (scheme.questions if scheme else []))

    return [
        SessionResult(
            student_id=sub.student_id,
            total_score=sub.total_score,
            max_possible=max_possible,
            status=sub.status,
            submission_id=sub.id,
        )
        for sub in submissions
    ]
