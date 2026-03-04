from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
import uuid
from app.models.session import SessionStatus


class SessionCreate(BaseModel):
    class_id: uuid.UUID
    course_id: uuid.UUID


class SessionOut(BaseModel):
    id: uuid.UUID
    operator_id: uuid.UUID
    class_id: uuid.UUID
    course_id: uuid.UUID
    status: SessionStatus
    created_at: datetime
    submission_count: int = 0
    has_scheme: bool = False

    class Config:
        from_attributes = True


class SheetCreate(BaseModel):
    image_url: str
    ocr_text: Optional[str] = None
    ocr_metadata: Optional[Any] = None
    upload_order: int


class SheetResolve(BaseModel):
    student_id_confirmed: str
