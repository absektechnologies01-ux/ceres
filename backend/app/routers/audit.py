from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.session import ScanSession
from app.models.submission import Submission
from app.models.submission import Sheet
from app.models.marking import MarkingScheme, MarkingReview, ReviewStatus, QuestionScore
from app.models.institution import TeacherAssignment, Class, Course
from app.schemas.marking import ReviewOut, RejectInput

router = APIRouter(tags=["audit"])

admin_only = require_role(UserRole.admin)
teacher_or_admin = require_role(UserRole.teacher, UserRole.admin)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_or_create_review(session_id: uuid.UUID, db: Session) -> MarkingReview:
    review = db.query(MarkingReview).filter(MarkingReview.session_id == session_id).first()
    if not review:
        review = MarkingReview(session_id=session_id, status=ReviewStatus.pending)
        db.add(review)
        db.flush()
    return review


def _get_session_or_404(session_id: uuid.UUID, db: Session) -> ScanSession:
    session = db.query(ScanSession).filter(ScanSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


# ── Audit endpoints ───────────────────────────────────────────────────────────

@router.get("/admin/audit")
def list_audit_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    sessions = db.query(ScanSession).order_by(ScanSession.created_at.desc()).all()
    if not sessions:
        return []

    ids = [s.id for s in sessions]

    # Submission counts and marked counts
    sub_counts = {
        row.session_id: row.total
        for row in db.query(Submission.session_id, func.count(Submission.id).label("total"))
        .filter(Submission.session_id.in_(ids))
        .group_by(Submission.session_id).all()
    }
    marked_counts = {
        row.session_id: row.marked
        for row in db.query(Submission.session_id, func.count(Submission.id).label("marked"))
        .filter(Submission.session_id.in_(ids), Submission.status == "marked")
        .group_by(Submission.session_id).all()
    }

    # Reviews
    reviews = {
        r.session_id: r
        for r in db.query(MarkingReview).filter(MarkingReview.session_id.in_(ids)).all()
    }

    # Teacher names via assignments
    assignments = db.query(TeacherAssignment).filter(
        TeacherAssignment.class_id.in_([s.class_id for s in sessions]),
        TeacherAssignment.course_id.in_([s.course_id for s in sessions]),
    ).all()
    teacher_ids = list({a.teacher_id for a in assignments})
    teachers = {u.id: u.name for u in db.query(User).filter(User.id.in_(teacher_ids)).all()}

    def _teacher_for(session: ScanSession) -> Optional[str]:
        for a in assignments:
            if a.class_id == session.class_id and a.course_id == session.course_id:
                return teachers.get(a.teacher_id)
        return None

    # Class and course names
    class_map = {c.id: c.name for c in db.query(Class).filter(Class.id.in_([s.class_id for s in sessions])).all()}
    course_map = {c.id: f"{c.code} {c.name}" for c in db.query(Course).filter(Course.id.in_([s.course_id for s in sessions])).all()}

    # Operator names
    operator_ids = list({s.operator_id for s in sessions})
    operator_map = {u.id: u.name for u in db.query(User).filter(User.id.in_(operator_ids)).all()}

    result = []
    for s in sessions:
        review = reviews.get(s.id)
        total = sub_counts.get(s.id, 0)
        marked = marked_counts.get(s.id, 0)
        result.append({
            "session_id": s.id,
            "class_name": class_map.get(s.class_id, ""),
            "course_name": course_map.get(s.course_id, ""),
            "operator_name": operator_map.get(s.operator_id, ""),
            "teacher_name": _teacher_for(s),
            "session_status": s.status.value,
            "created_at": s.created_at,
            "total_submissions": total,
            "marked_count": marked,
            "review_status": review.status.value if review else "pending",
            "review_note": review.note if review else None,
            "reviewed_at": review.reviewed_at if review else None,
        })
    return result


@router.get("/admin/audit/{session_id}")
def get_audit_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    session = _get_session_or_404(session_id, db)

    # Review status
    review = db.query(MarkingReview).filter(MarkingReview.session_id == session_id).first()

    # Marking scheme questions
    scheme = db.query(MarkingScheme).filter(MarkingScheme.session_id == session_id).first()
    scheme_questions = scheme.questions if scheme else []

    # Submissions with scores
    submissions = db.query(Submission).filter(Submission.session_id == session_id).all()
    sub_ids = [s.id for s in submissions]

    scores = db.query(QuestionScore).filter(QuestionScore.submission_id.in_(sub_ids)).all() if sub_ids else []

    # Teacher names for scores
    teacher_ids = list({sc.teacher_id for sc in scores})
    teacher_map = {u.id: u.name for u in db.query(User).filter(User.id.in_(teacher_ids)).all()} if teacher_ids else {}

    scores_by_sub = {}
    for sc in scores:
        scores_by_sub.setdefault(sc.submission_id, []).append({
            "question_number": sc.question_number,
            "awarded_marks": sc.awarded_marks,
            "max_marks": sc.max_marks,
            "comment": sc.comment,
            "marked_at": sc.marked_at,
            "teacher_name": teacher_map.get(sc.teacher_id, "Unknown"),
        })

    submissions_out = []
    for sub in submissions:
        submissions_out.append({
            "submission_id": sub.id,
            "student_id": sub.student_id,
            "status": sub.status.value,
            "total_score": sub.total_score,
            "scores": scores_by_sub.get(sub.id, []),
        })

    # Class/course names
    class_obj = db.query(Class).filter(Class.id == session.class_id).first()
    course_obj = db.query(Course).filter(Course.id == session.course_id).first()

    return {
        "session_id": session.id,
        "class_name": class_obj.name if class_obj else "",
        "course_name": f"{course_obj.code} {course_obj.name}" if course_obj else "",
        "session_status": session.status.value,
        "created_at": session.created_at,
        "review_status": review.status.value if review else "pending",
        "review_note": review.note if review else None,
        "reviewed_at": review.reviewed_at if review else None,
        "scheme_questions": scheme_questions,
        "submissions": submissions_out,
    }


@router.post("/admin/audit/{session_id}/approve", response_model=ReviewOut)
def approve_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    _get_session_or_404(session_id, db)
    review = _get_or_create_review(session_id, db)
    review.status = ReviewStatus.approved
    review.reviewer_id = current_user.id
    review.reviewed_at = datetime.now(timezone.utc)
    review.note = None
    db.commit()
    db.refresh(review)
    return review


@router.post("/admin/audit/{session_id}/reject", response_model=ReviewOut)
def reject_session(
    session_id: uuid.UUID,
    body: RejectInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    _get_session_or_404(session_id, db)
    review = _get_or_create_review(session_id, db)
    review.status = ReviewStatus.rejected
    review.reviewer_id = current_user.id
    review.reviewed_at = datetime.now(timezone.utc)
    review.note = body.note
    db.commit()
    db.refresh(review)
    return review


# ── Analytics endpoints ───────────────────────────────────────────────────────

@router.get("/admin/analytics")
def get_analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    total_sessions = db.query(func.count(ScanSession.id)).scalar() or 0
    total_submissions = db.query(func.count(Submission.id)).scalar() or 0
    total_flagged = db.query(func.count(Sheet.id)).filter(Sheet.flagged == True).scalar() or 0

    avg_score_result = db.query(func.avg(Submission.total_score)).filter(
        Submission.total_score.isnot(None)
    ).scalar()

    # Compute avg as percentage against max_possible per session
    # Simplified: average of (total_score / max_possible) across all marked submissions
    marked_subs = db.query(Submission).filter(
        Submission.status == "marked",
        Submission.total_score.isnot(None),
    ).all()

    avg_pct = None
    if marked_subs:
        pcts = []
        for sub in marked_subs:
            scores = db.query(QuestionScore).filter(QuestionScore.submission_id == sub.id).all()
            max_possible = sum(sc.max_marks for sc in scores)
            if max_possible > 0:
                pcts.append((sub.total_score / max_possible) * 100)
        avg_pct = round(sum(pcts) / len(pcts), 1) if pcts else None

    reviews = db.query(MarkingReview).all()
    approved = sum(1 for r in reviews if r.status == ReviewStatus.approved)
    rejected = sum(1 for r in reviews if r.status == ReviewStatus.rejected)
    pending_review = total_sessions - approved - rejected

    return {
        "total_sessions": total_sessions,
        "total_submissions": total_submissions,
        "total_flagged_sheets": total_flagged,
        "average_score_pct": avg_pct,
        "sessions_approved": approved,
        "sessions_pending_review": max(0, pending_review),
        "sessions_rejected": rejected,
    }


@router.get("/sessions/{session_id}/analytics")
def get_session_analytics(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(teacher_or_admin),
):
    session = _get_session_or_404(session_id, db)

    submissions = db.query(Submission).filter(Submission.session_id == session_id).all()
    total = len(submissions)
    marked = sum(1 for s in submissions if s.status == "marked")

    if not submissions:
        return {
            "session_id": session_id,
            "total_submissions": 0,
            "marked_count": 0,
            "average_score": None,
            "max_possible": 0,
            "pass_rate": None,
            "score_distribution": [],
            "question_performance": [],
        }

    sub_ids = [s.id for s in submissions]
    all_scores = db.query(QuestionScore).filter(QuestionScore.submission_id.in_(sub_ids)).all()

    # Max possible (from scheme)
    scheme = db.query(MarkingScheme).filter(MarkingScheme.session_id == session_id).first()
    max_possible = 0.0
    scheme_questions = []
    if scheme and scheme.questions:
        for q in scheme.questions:
            max_possible += float(q.get("max_marks", 0))
            scheme_questions.append(q)

    # Average score across marked submissions
    scored_totals = [s.total_score for s in submissions if s.total_score is not None]
    avg_score = round(sum(scored_totals) / len(scored_totals), 2) if scored_totals else None

    # Pass rate (>= 50% threshold)
    pass_count = 0
    if max_possible > 0:
        pass_count = sum(1 for t in scored_totals if t / max_possible >= 0.5)
    pass_rate = round(pass_count / len(scored_totals), 2) if scored_totals else None

    # Score distribution (dynamic buckets based on max_possible)
    bucket_size = max(1, int(max_possible / 8)) if max_possible > 0 else 10
    distribution: dict = {}
    for t in scored_totals:
        bucket_start = int(t // bucket_size) * bucket_size
        bucket_end = bucket_start + bucket_size
        label = f"{bucket_start}-{bucket_end}"
        distribution[label] = distribution.get(label, 0) + 1
    score_distribution = [{"range": k, "count": v} for k, v in sorted(distribution.items())]

    # Question performance
    scores_by_q: dict = {}
    for sc in all_scores:
        scores_by_q.setdefault(sc.question_number, []).append(sc.awarded_marks)

    question_performance = []
    for q in scheme_questions:
        qnum = q.get("question_number", "")
        label = q.get("label_variants", [qnum])[0] if q.get("label_variants") else qnum
        marks_list = [m for m in scores_by_q.get(qnum, []) if m is not None]
        avg_awarded = round(sum(marks_list) / len(marks_list), 2) if marks_list else 0
        q_max = float(q.get("max_marks", 1))
        avg_pct = round((avg_awarded / q_max) * 100, 1) if q_max > 0 else 0
        question_performance.append({
            "question_number": qnum,
            "label": label,
            "average_awarded": avg_awarded,
            "max_marks": q_max,
            "avg_pct": avg_pct,
        })

    return {
        "session_id": session_id,
        "total_submissions": total,
        "marked_count": marked,
        "average_score": avg_score,
        "max_possible": max_possible,
        "pass_rate": pass_rate,
        "score_distribution": score_distribution,
        "question_performance": question_performance,
    }
