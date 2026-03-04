import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class School(Base):
    __tablename__ = "schools"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    faculties = relationship("Faculty", back_populates="school")


class Faculty(Base):
    __tablename__ = "faculties"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    school = relationship("School", back_populates="faculties")
    departments = relationship("Department", back_populates="faculty")


class Department(Base):
    __tablename__ = "departments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    faculty_id = Column(UUID(as_uuid=True), ForeignKey("faculties.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    faculty = relationship("Faculty", back_populates="departments")
    classes = relationship("Class", back_populates="department")
    courses = relationship("Course", back_populates="department")


class Class(Base):
    __tablename__ = "classes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)
    academic_year = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    department = relationship("Department", back_populates="classes")
    assignments = relationship("TeacherAssignment", back_populates="class_")


class Course(Base):
    __tablename__ = "courses"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    department = relationship("Department", back_populates="courses")
    assignments = relationship("TeacherAssignment", back_populates="course")


class TeacherAssignment(Base):
    __tablename__ = "teacher_assignments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    teacher = relationship("User", back_populates="assignments", foreign_keys=[teacher_id])
    class_ = relationship("Class", back_populates="assignments")
    course = relationship("Course", back_populates="assignments")
