from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.dependencies import require_role, get_current_user
from app.models.user import User, UserRole
from app.models.institution import School, Faculty, Department, Class, Course, TeacherAssignment
from app.services.auth_service import hash_password
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.schemas.institution import (
    SchoolCreate, SchoolOut,
    FacultyCreate, FacultyOut,
    DepartmentCreate, DepartmentOut,
    ClassCreate, ClassOut,
    CourseCreate, CourseOut,
    AssignmentCreate, AssignmentOut,
)

router = APIRouter(prefix="/admin", tags=["admin"])
admin_only = require_role(UserRole.admin)


# ─── Users ───────────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(admin_only)):
    return db.query(User).all()


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=body.name,
        email=body.email,
        role=body.role,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: uuid.UUID, body: UserUpdate, db: Session = Depends(get_db), _=Depends(admin_only)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.name is not None:
        user.name = body.name
    if body.email is not None:
        existing = db.query(User).filter(User.email == body.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = body.email
    if body.role is not None:
        user.role = body.role
    if body.password is not None:
        user.hashed_password = hash_password(body.password)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(admin_only)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()


# ─── Schools ─────────────────────────────────────────────────────────────────

@router.get("/schools", response_model=List[SchoolOut])
def list_schools(db: Session = Depends(get_db), _=Depends(admin_only)):
    return db.query(School).all()


@router.post("/schools", response_model=SchoolOut, status_code=status.HTTP_201_CREATED)
def create_school(body: SchoolCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    school = School(name=body.name)
    db.add(school)
    db.commit()
    db.refresh(school)
    return school


@router.put("/schools/{school_id}", response_model=SchoolOut)
def update_school(school_id: uuid.UUID, body: SchoolCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    school.name = body.name
    db.commit()
    db.refresh(school)
    return school


@router.delete("/schools/{school_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_school(school_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(admin_only)):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    db.delete(school)
    db.commit()


# ─── Faculties ────────────────────────────────────────────────────────────────

@router.get("/faculties", response_model=List[FacultyOut])
def list_faculties(db: Session = Depends(get_db), _=Depends(admin_only)):
    return db.query(Faculty).all()


@router.post("/faculties", response_model=FacultyOut, status_code=status.HTTP_201_CREATED)
def create_faculty(body: FacultyCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    if not db.query(School).filter(School.id == body.school_id).first():
        raise HTTPException(status_code=404, detail="School not found")
    faculty = Faculty(name=body.name, school_id=body.school_id)
    db.add(faculty)
    db.commit()
    db.refresh(faculty)
    return faculty


@router.put("/faculties/{faculty_id}", response_model=FacultyOut)
def update_faculty(faculty_id: uuid.UUID, body: FacultyCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    faculty.name = body.name
    faculty.school_id = body.school_id
    db.commit()
    db.refresh(faculty)
    return faculty


@router.delete("/faculties/{faculty_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_faculty(faculty_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(admin_only)):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    db.delete(faculty)
    db.commit()


# ─── Departments ──────────────────────────────────────────────────────────────

@router.get("/departments", response_model=List[DepartmentOut])
def list_departments(db: Session = Depends(get_db), _=Depends(admin_only)):
    return db.query(Department).all()


@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(body: DepartmentCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    if not db.query(Faculty).filter(Faculty.id == body.faculty_id).first():
        raise HTTPException(status_code=404, detail="Faculty not found")
    dept = Department(name=body.name, faculty_id=body.faculty_id)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.put("/departments/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: uuid.UUID, body: DepartmentCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    dept.name = body.name
    dept.faculty_id = body.faculty_id
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/departments/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(dept_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(admin_only)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(dept)
    db.commit()


# ─── Classes ──────────────────────────────────────────────────────────────────

@router.get("/classes", response_model=List[ClassOut])
def list_classes(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Class).all()


@router.post("/classes", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
def create_class(body: ClassCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    if not db.query(Department).filter(Department.id == body.department_id).first():
        raise HTTPException(status_code=404, detail="Department not found")
    cls = Class(name=body.name, department_id=body.department_id, academic_year=body.academic_year)
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls


@router.put("/classes/{class_id}", response_model=ClassOut)
def update_class(class_id: uuid.UUID, body: ClassCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    cls.name = body.name
    cls.department_id = body.department_id
    cls.academic_year = body.academic_year
    db.commit()
    db.refresh(cls)
    return cls


@router.delete("/classes/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(class_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(admin_only)):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    db.delete(cls)
    db.commit()


# ─── Courses ──────────────────────────────────────────────────────────────────

@router.get("/courses", response_model=List[CourseOut])
def list_courses(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Course).all()


@router.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(body: CourseCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    if not db.query(Department).filter(Department.id == body.department_id).first():
        raise HTTPException(status_code=404, detail="Department not found")
    course = Course(code=body.code, name=body.name, department_id=body.department_id)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.put("/courses/{course_id}", response_model=CourseOut)
def update_course(course_id: uuid.UUID, body: CourseCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.code = body.code
    course.name = body.name
    course.department_id = body.department_id
    db.commit()
    db.refresh(course)
    return course


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(admin_only)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()


# ─── Assignments ──────────────────────────────────────────────────────────────

@router.get("/assignments", response_model=List[AssignmentOut])
def list_assignments(db: Session = Depends(get_db), _=Depends(admin_only)):
    return db.query(TeacherAssignment).all()


@router.post("/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def create_assignment(body: AssignmentCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    teacher = db.query(User).filter(User.id == body.teacher_id, User.role == UserRole.teacher).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    if not db.query(Class).filter(Class.id == body.class_id).first():
        raise HTTPException(status_code=404, detail="Class not found")
    if not db.query(Course).filter(Course.id == body.course_id).first():
        raise HTTPException(status_code=404, detail="Course not found")
    # Check for duplicate assignment
    existing = db.query(TeacherAssignment).filter(
        TeacherAssignment.teacher_id == body.teacher_id,
        TeacherAssignment.class_id == body.class_id,
        TeacherAssignment.course_id == body.course_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Assignment already exists")
    assignment = TeacherAssignment(
        teacher_id=body.teacher_id,
        class_id=body.class_id,
        course_id=body.course_id,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(assignment_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(admin_only)):
    assignment = db.query(TeacherAssignment).filter(TeacherAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
