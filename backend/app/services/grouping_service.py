from sqlalchemy.orm import Session
from app.models.submission import Sheet, Submission, SubmissionStatus
from app.utils.student_id_extractor import extract_student_id
from app.config import settings


def process_sheet_and_group(sheet: Sheet, db: Session) -> Sheet:
    """
    Extracts student ID from sheet OCR data, groups with existing submission
    or creates a new one. Flags sheet if confidence is below threshold.
    """
    student_id, confidence = extract_student_id(
        sheet.ocr_text or "",
        sheet.ocr_metadata or {}
    )

    sheet.student_id_raw = student_id
    sheet.id_confidence = confidence

    if confidence < settings.STUDENT_ID_CONFIDENCE_THRESHOLD:
        sheet.flagged = True
        db.commit()
        return sheet

    sheet.student_id_confirmed = student_id
    sheet.flagged = False

    # Find or create submission for this student in this session
    submission = db.query(Submission).filter(
        Submission.session_id == sheet.session_id,
        Submission.student_id == student_id
    ).first()

    if not submission:
        submission = Submission(
            session_id=sheet.session_id,
            student_id=student_id,
            status=SubmissionStatus.pending
        )
        db.add(submission)
        db.flush()

    sheet.submission_id = submission.id
    db.commit()
    db.refresh(sheet)
    return sheet
