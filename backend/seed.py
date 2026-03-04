"""
Seed script — creates the initial admin user and sample data.
Run from the backend/ directory with: python seed.py
"""
import sys
import os

# Ensure app is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.institution import School, Faculty, Department, Class, Course, TeacherAssignment
from app.services.auth_service import hash_password


def seed():
    db = SessionLocal()
    try:
        # ── Admin user ──────────────────────────────────────────────────────
        if not db.query(User).filter(User.email == "admin@ceres.app").first():
            admin = User(
                name="Admin",
                email="admin@ceres.app",
                role=UserRole.admin,
                hashed_password=hash_password("admin123"),
            )
            db.add(admin)
            print("Created admin user: admin@ceres.app / admin123")
        else:
            print("Admin user already exists, skipping.")

        # ── Sample teacher ──────────────────────────────────────────────────
        teacher = db.query(User).filter(User.email == "teacher@ceres.app").first()
        if not teacher:
            teacher = User(
                name="Dr. Asante",
                email="teacher@ceres.app",
                role=UserRole.teacher,
                hashed_password=hash_password("teacher123"),
            )
            db.add(teacher)
            db.flush()
            print("Created teacher: teacher@ceres.app / teacher123")
        else:
            print("Teacher already exists, skipping.")

        # ── Sample operator ─────────────────────────────────────────────────
        if not db.query(User).filter(User.email == "operator@ceres.app").first():
            operator = User(
                name="Scan Operator",
                email="operator@ceres.app",
                role=UserRole.scanner_operator,
                hashed_password=hash_password("operator123"),
            )
            db.add(operator)
            print("Created operator: operator@ceres.app / operator123")
        else:
            print("Operator already exists, skipping.")

        # ── Sample institution hierarchy ─────────────────────────────────────
        school = db.query(School).filter(School.name == "University of Ghana").first()
        if not school:
            school = School(name="University of Ghana")
            db.add(school)
            db.flush()

            faculty = Faculty(name="Faculty of Science", school_id=school.id)
            db.add(faculty)
            db.flush()

            dept = Department(name="Computer Science", faculty_id=faculty.id)
            db.add(dept)
            db.flush()

            cls = Class(name="CS Level 300", department_id=dept.id, academic_year="2024/2025")
            db.add(cls)

            course = Course(code="CS301", name="Algorithm Design", department_id=dept.id)
            db.add(course)
            db.flush()

            # Assign teacher to class+course
            db.flush()
            assignment = TeacherAssignment(
                teacher_id=teacher.id,
                class_id=cls.id,
                course_id=course.id,
            )
            db.add(assignment)
            print("Created sample institution, class, course, and teacher assignment.")
        else:
            print("Sample institution already exists, skipping.")

        db.commit()
        print("\nSeed complete.")
        print("─" * 40)
        print("Admin:    admin@ceres.app     / admin123")
        print("Teacher:  teacher@ceres.app   / teacher123")
        print("Operator: operator@ceres.app  / operator123")

    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
