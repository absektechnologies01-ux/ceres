from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
import uuid


class SchemeOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    teacher_id: uuid.UUID
    original_file_url: str
    questions: Any
    created_at: datetime

    class Config:
        from_attributes = True


class ScoreInput(BaseModel):
    question_number: str
    awarded_marks: float
    max_marks: float
    comment: Optional[str] = None


class CommentInput(BaseModel):
    comment: Optional[str] = None


class QuestionScoreOut(BaseModel):
    id: uuid.UUID
    submission_id: uuid.UUID
    question_number: str
    awarded_marks: Optional[float] = None
    max_marks: float
    comment: Optional[str] = None
    marked_at: Optional[datetime] = None
    teacher_id: uuid.UUID

    class Config:
        from_attributes = True


class SessionResult(BaseModel):
    student_id: str
    total_score: Optional[float]
    max_possible: float
    status: str
    submission_id: uuid.UUID


class ReviewOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    reviewer_id: Optional[uuid.UUID] = None
    status: str
    note: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RejectInput(BaseModel):
    note: str
