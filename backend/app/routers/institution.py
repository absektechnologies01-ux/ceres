from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies import get_current_user
from app.models.institution import Class, Course
from app.schemas.institution import ClassOut, CourseOut

router = APIRouter(tags=["institution"])


@router.get("/classes", response_model=List[ClassOut])
def list_classes(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Return all classes. Accessible by any authenticated user."""
    return db.query(Class).order_by(Class.name).all()


@router.get("/courses", response_model=List[CourseOut])
def list_courses(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Return all courses. Accessible by any authenticated user."""
    return db.query(Course).order_by(Course.code).all()
