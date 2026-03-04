from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class SchoolCreate(BaseModel):
    name: str


class SchoolOut(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class FacultyCreate(BaseModel):
    name: str
    school_id: uuid.UUID


class FacultyOut(BaseModel):
    id: uuid.UUID
    name: str
    school_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class DepartmentCreate(BaseModel):
    name: str
    faculty_id: uuid.UUID


class DepartmentOut(BaseModel):
    id: uuid.UUID
    name: str
    faculty_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ClassCreate(BaseModel):
    name: str
    department_id: uuid.UUID
    academic_year: str


class ClassOut(BaseModel):
    id: uuid.UUID
    name: str
    department_id: uuid.UUID
    academic_year: str
    created_at: datetime

    class Config:
        from_attributes = True


class CourseCreate(BaseModel):
    code: str
    name: str
    department_id: uuid.UUID


class CourseOut(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    department_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class AssignmentCreate(BaseModel):
    teacher_id: uuid.UUID
    class_id: uuid.UUID
    course_id: uuid.UUID


class AssignmentOut(BaseModel):
    id: uuid.UUID
    teacher_id: uuid.UUID
    class_id: uuid.UUID
    course_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True
