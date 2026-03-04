import uuid
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    scanner_operator = "scanner_operator"


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    role = Column(SQLEnum(UserRole), nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    assignments = relationship("TeacherAssignment", back_populates="teacher", foreign_keys="TeacherAssignment.teacher_id")
    sessions = relationship("ScanSession", back_populates="operator")
