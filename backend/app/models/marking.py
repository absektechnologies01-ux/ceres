import uuid
from sqlalchemy import Column, String, DateTime, Float, Text, ForeignKey, func, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class MarkingScheme(Base):
    __tablename__ = "marking_schemes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("scan_sessions.id"), nullable=False, unique=True)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    original_file_url = Column(String, nullable=False)
    questions = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    session = relationship("ScanSession", back_populates="marking_scheme")
    teacher = relationship("User")


class QuestionScore(Base):
    __tablename__ = "question_scores"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id"), nullable=False, index=True)
    question_number = Column(String, nullable=False)
    awarded_marks = Column(Float, nullable=True)
    max_marks = Column(Float, nullable=False)
    comment = Column(Text, nullable=True)
    marked_at = Column(DateTime(timezone=True), onupdate=func.now())
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    submission = relationship("Submission", back_populates="scores")
    teacher = relationship("User")
