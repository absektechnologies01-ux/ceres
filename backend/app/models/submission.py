import uuid
from sqlalchemy import Column, String, DateTime, Float, Boolean, Integer, Text, ForeignKey, Enum as SQLEnum, func, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class SubmissionStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    marked = "marked"


class Sheet(Base):
    __tablename__ = "sheets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("scan_sessions.id"), nullable=False, index=True)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id"), nullable=True)
    student_id_raw = Column(String, nullable=True)
    student_id_confirmed = Column(String, nullable=True)
    image_url = Column(String, nullable=False)
    ocr_text = Column(Text, nullable=True)
    ocr_metadata = Column(JSONB, nullable=True)
    id_confidence = Column(Float, nullable=True)
    flagged = Column(Boolean, default=False)
    upload_order = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    session = relationship("ScanSession", back_populates="sheets")
    submission = relationship("Submission", back_populates="sheets")


class Submission(Base):
    __tablename__ = "submissions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("scan_sessions.id"), nullable=False, index=True)
    student_id = Column(String, nullable=False, index=True)
    status = Column(SQLEnum(SubmissionStatus), default=SubmissionStatus.pending)
    total_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    session = relationship("ScanSession", back_populates="submissions")
    sheets = relationship("Sheet", back_populates="submission", order_by="Sheet.upload_order")
    scores = relationship("QuestionScore", back_populates="submission")
