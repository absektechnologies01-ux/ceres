import uuid
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class SessionStatus(str, enum.Enum):
    active = "active"
    closed = "closed"


class ScanSession(Base):
    __tablename__ = "scan_sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.active)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    operator = relationship("User", back_populates="sessions")
    class_ = relationship("Class")
    course = relationship("Course")
    sheets = relationship("Sheet", back_populates="session")
    submissions = relationship("Submission", back_populates="session")
    marking_scheme = relationship("MarkingScheme", back_populates="session", uselist=False)
    review = relationship("MarkingReview", back_populates="session", uselist=False)
