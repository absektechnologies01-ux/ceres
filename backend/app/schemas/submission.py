from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
import uuid
from app.models.submission import SubmissionStatus


class SheetOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    submission_id: Optional[uuid.UUID] = None
    student_id_raw: Optional[str] = None
    student_id_confirmed: Optional[str] = None
    image_url: str
    ocr_text: Optional[str] = None
    ocr_metadata: Optional[Any] = None
    id_confidence: Optional[float] = None
    flagged: bool
    upload_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class SubmissionOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    student_id: str
    status: SubmissionStatus
    total_score: Optional[float] = None
    created_at: datetime
    sheets: list[SheetOut] = []

    class Config:
        from_attributes = True


class SubmissionQuestion(BaseModel):
    question_number: str
    label: str
    question_text: Optional[str] = None
    text_content: str
    max_marks: float
    expected_answer: str
    awarded_marks: Optional[float] = None
    comment: Optional[str] = None
    sheet_id: Optional[str] = None


class AiSuggestionRequest(BaseModel):
    question_text: str
    student_answer: str
    expected_answer: str
    max_marks: float


class AiSuggestionResponse(BaseModel):
    ai_answer: str
    suggested_score: float
    rationale: str
