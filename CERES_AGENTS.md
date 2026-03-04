# CERES — Claude Code Build Guide

> **Read this entire document before writing a single line of code.** This is the canonical instruction set for building the Ceres Digital Examination Grading System from scratch. Follow it section by section, in order. Do not skip ahead.

---

## 0. What You Are Building

Ceres is a three-part system:

1. **Backend** — FastAPI (Python) REST API
2. **Frontend** — React + TypeScript web application
3. **Mobile** — Flutter application for the scanning hardware unit

Build in this order: **Backend → Frontend → Mobile**. Each section below tells you exactly what to build, in what order, with full file structure, data models, and logic requirements.

---

## 1. Project Structure (Monorepo)

Create this top-level structure first:

```
ceres/
├── backend/
├── frontend/
├── mobile/
└── README.md
```

---

## 2. BACKEND — FastAPI

### 2.1 Setup

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── dependencies.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── institution.py
│   │   ├── session.py
│   │   ├── submission.py
│   │   └── marking.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── institution.py
│   │   ├── session.py
│   │   ├── submission.py
│   │   └── marking.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── admin.py
│   │   ├── sessions.py
│   │   ├── submissions.py
│   │   ├── marking.py
│   │   └── schemes.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── ocr_service.py
│   │   ├── grouping_service.py
│   │   ├── scheme_parser_service.py
│   │   └── imagekit_service.py
│   └── utils/
│       ├── __init__.py
│       ├── student_id_extractor.py
│       └── question_detector.py
├── alembic/
├── alembic.ini
├── requirements.txt
├── .env.example
└── README.md
```

**`requirements.txt`:**
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
alembic==1.13.1
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
httpx==0.27.0
python-docx==1.1.2
pdfplumber==0.11.0
imagekitio==3.2.5
pydantic-settings==2.2.1
pydantic[email]==2.7.1
python-dotenv==1.0.1
```

**`app/config.py`:**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    IMAGEKIT_PUBLIC_KEY: str
    IMAGEKIT_PRIVATE_KEY: str
    IMAGEKIT_URL_ENDPOINT: str
    CHANDRA_OCR_API_URL: str
    CHANDRA_OCR_API_KEY: str
    STUDENT_ID_CONFIDENCE_THRESHOLD: float = 0.85

    class Config:
        env_file = ".env"

settings = Settings()
```

**`app/database.py`:**
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

### 2.2 Database Models

#### `app/models/user.py`
```python
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
```

#### `app/models/institution.py`
```python
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
```

#### `app/models/session.py`
```python
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
```

#### `app/models/submission.py`
```python
import uuid
from sqlalchemy import Column, String, DateTime, Float, Boolean, Integer, Text, ForeignKey, Enum as SQLEnum, func
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
    session_id = Column(UUID(as_uuid=True), ForeignKey("scan_sessions.id"), nullable=False)
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
    session_id = Column(UUID(as_uuid=True), ForeignKey("scan_sessions.id"), nullable=False)
    student_id = Column(String, nullable=False, index=True)
    status = Column(SQLEnum(SubmissionStatus), default=SubmissionStatus.pending)
    total_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    session = relationship("ScanSession", back_populates="submissions")
    sheets = relationship("Sheet", back_populates="submission", order_by="Sheet.upload_order")
    scores = relationship("QuestionScore", back_populates="submission")
```

#### `app/models/marking.py`
```python
import uuid
from sqlalchemy import Column, String, DateTime, Float, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base

class MarkingScheme(Base):
    __tablename__ = "marking_schemes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("scan_sessions.id"), nullable=False, unique=True)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    original_file_url = Column(String, nullable=False)
    questions = Column(JSONB, nullable=False)  # Parsed question list
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    session = relationship("ScanSession", back_populates="marking_scheme")
    teacher = relationship("User")

class QuestionScore(Base):
    __tablename__ = "question_scores"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id"), nullable=False)
    question_number = Column(String, nullable=False)
    awarded_marks = Column(Float, nullable=True)
    max_marks = Column(Float, nullable=False)
    comment = Column(Text, nullable=True)  # Optional teacher comment per question
    marked_at = Column(DateTime(timezone=True), onupdate=func.now())
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    submission = relationship("Submission", back_populates="scores")
    teacher = relationship("User")
```

---

### 2.3 Auth

#### `app/services/auth_service.py`
```python
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
```

#### `app/dependencies.py`
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import decode_token
from app.models.user import User, UserRole
from jose import JWTError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def require_role(*roles: UserRole):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return checker
```

#### `app/routers/auth.py`
```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.services.auth_service import verify_password, create_access_token, create_refresh_token
from app.schemas.user import TokenResponse, RefreshRequest
from app.dependencies import get_current_user, decode_token
from jose import JWTError

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {
        "access_token": create_access_token({"sub": str(user.id), "role": user.role}),
        "refresh_token": create_refresh_token({"sub": str(user.id), "role": user.role}),
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
    }

@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = db.query(User).filter(User.id == payload["sub"]).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {
            "access_token": create_access_token({"sub": str(user.id), "role": user.role}),
            "refresh_token": body.refresh_token,
            "token_type": "bearer",
            "role": user.role,
            "name": user.name,
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
```

---

### 2.4 Core Services

#### `app/utils/student_id_extractor.py`
```python
import re
from typing import Optional, Tuple

STUDENT_ID_PATTERN = re.compile(r'\b\d{10}\b')

def extract_student_id(ocr_text: str, ocr_metadata: dict) -> Tuple[Optional[str], float]:
    """
    Extracts student ID from the top-right region of the OCR output.
    Uses positional metadata to target the expected location.
    Returns (student_id, confidence_score).
    """
    # Strategy 1: Use positional metadata to find text in top-right quadrant
    if ocr_metadata and "blocks" in ocr_metadata:
        top_right_candidates = _extract_top_right_candidates(ocr_metadata)
        for candidate in top_right_candidates:
            match = STUDENT_ID_PATTERN.search(candidate["text"])
            if match:
                return match.group(), candidate.get("confidence", 0.9)

    # Strategy 2: Fallback — scan full text for 10-digit number
    matches = STUDENT_ID_PATTERN.findall(ocr_text)
    if matches:
        return matches[0], 0.6  # Lower confidence for positional fallback

    return None, 0.0

def _extract_top_right_candidates(metadata: dict) -> list:
    """
    Filter OCR blocks that appear in the top-right quadrant.
    Assumes metadata has page_width, page_height, and blocks with bbox.
    """
    candidates = []
    page_w = metadata.get("page_width", 1)
    page_h = metadata.get("page_height", 1)
    for block in metadata.get("blocks", []):
        bbox = block.get("bbox", {})
        x = bbox.get("x", 0)
        y = bbox.get("y", 0)
        # Top-right quadrant: right half, top 25%
        if x > page_w * 0.5 and y < page_h * 0.25:
            candidates.append({"text": block.get("text", ""), "confidence": block.get("confidence", 0.7)})
    return candidates
```

#### `app/utils/question_detector.py`
```python
import re
from typing import List, Dict

QUESTION_LABEL_PATTERN = re.compile(
    r'(?:^|\n)\s*((?:Q|q|Question|question|QUESTION)\s*\.?\s*(\d+[a-zA-Z]?))\b',
    re.MULTILINE
)

def detect_questions(ocr_text: str, ocr_metadata: dict = None) -> List[Dict]:
    """
    Detects question labels in OCR text and returns structured list.
    Each item: { label, question_number, start_pos, text_content }
    """
    questions = []
    matches = list(QUESTION_LABEL_PATTERN.finditer(ocr_text))

    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(ocr_text)
        questions.append({
            "label": match.group(1).strip(),
            "question_number": match.group(2).strip(),
            "start_pos": start,
            "text_content": ocr_text[match.end():end].strip()
        })

    return questions
```

#### `app/services/grouping_service.py`
```python
from sqlalchemy.orm import Session
from app.models.submission import Sheet, Submission, SubmissionStatus
from app.utils.student_id_extractor import extract_student_id
from app.config import settings
import uuid

def process_sheet_and_group(sheet: Sheet, db: Session) -> Sheet:
    """
    Extracts student ID from sheet OCR data, groups with existing submission
    or creates a new one. Flags sheet if confidence is below threshold.
    """
    student_id, confidence = extract_student_id(
        sheet.ocr_text or "",
        sheet.ocr_metadata or {}
    )

    sheet.student_id_raw = student_id
    sheet.id_confidence = confidence

    if confidence < settings.STUDENT_ID_CONFIDENCE_THRESHOLD:
        sheet.flagged = True
        db.commit()
        return sheet

    sheet.student_id_confirmed = student_id
    sheet.flagged = False

    # Find or create submission for this student in this session
    submission = db.query(Submission).filter(
        Submission.session_id == sheet.session_id,
        Submission.student_id == student_id
    ).first()

    if not submission:
        submission = Submission(
            session_id=sheet.session_id,
            student_id=student_id,
            status=SubmissionStatus.pending
        )
        db.add(submission)
        db.flush()

    sheet.submission_id = submission.id
    db.commit()
    db.refresh(sheet)
    return sheet
```

#### `app/services/scheme_parser_service.py`
```python
import re
import io
from typing import List, Dict
import pdfplumber
from docx import Document as DocxDocument

def parse_scheme_file(file_content: bytes, filename: str) -> List[Dict]:
    """
    Parses a PDF or Word marking scheme document.
    Returns a list of question objects:
    { question_number, label_variants, max_marks, expected_answer, sub_questions }
    """
    if filename.lower().endswith(".pdf"):
        text = _extract_pdf_text(file_content)
    elif filename.lower().endswith((".docx", ".doc")):
        text = _extract_docx_text(file_content)
    else:
        raise ValueError("Unsupported file format. Use PDF or DOCX.")

    return _parse_scheme_text(text)

def _extract_pdf_text(content: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            text_parts.append(page.extract_text() or "")
    return "\n".join(text_parts)

def _extract_docx_text(content: bytes) -> str:
    doc = DocxDocument(io.BytesIO(content))
    return "\n".join([p.text for p in doc.paragraphs])

def _parse_scheme_text(text: str) -> List[Dict]:
    """
    Attempts to parse structured questions from scheme text.
    Looks for patterns like:
      Q1 / Question 1 (10 marks) — expected answer text
    """
    question_pattern = re.compile(
        r'(?:^|\n)\s*(?:Q|Question|question)\s*\.?\s*(\d+[a-zA-Z]?)'
        r'.*?(?:\((\d+(?:\.\d+)?)\s*marks?\))?'
        r'\s*[:\-–]?\s*(.*?)(?=(?:\n\s*(?:Q|Question|question)\s*\.?\s*\d+)|\Z)',
        re.IGNORECASE | re.DOTALL
    )

    questions = []
    for match in question_pattern.finditer(text):
        q_num = match.group(1).strip()
        max_marks = float(match.group(2)) if match.group(2) else 0.0
        expected = match.group(3).strip()

        questions.append({
            "question_number": q_num,
            "label_variants": _generate_label_variants(q_num),
            "max_marks": max_marks,
            "expected_answer": expected,
            "sub_questions": []
        })

    return questions

def _generate_label_variants(q_num: str) -> List[str]:
    return [
        f"Q{q_num}", f"q{q_num}", f"Q.{q_num}", f"q.{q_num}",
        f"Question {q_num}", f"question {q_num}", f"QUESTION {q_num}",
        f"Q {q_num}", f"q {q_num}"
    ]
```

---

### 2.5 Routers

#### `app/routers/sessions.py`
Build full CRUD for scan sessions. Key endpoints:
- `POST /sessions` — create session (operator only). Body: `{ class_id, course_id }`
- `GET /sessions` — list sessions for current operator
- `GET /sessions/{id}` — session detail
- `PUT /sessions/{id}/close` — close a session
- `POST /sessions/{id}/sheets` — upload a sheet (multipart: image file + ocr_text + ocr_metadata JSON). Auto-triggers grouping service after upload. Returns sheet with flagged status.
- `GET /sessions/{id}/sheets` — all sheets in session, grouped by submission
- `GET /sessions/{id}/sheets/flagged` — only flagged sheets
- `PUT /sessions/{id}/sheets/{sheet_id}/resolve` — operator manually sets `student_id_confirmed` on a flagged sheet and triggers grouping

#### `app/routers/submissions.py`
- `GET /sessions/{id}/submissions` — all submissions for a session with status + total_score
- `GET /submissions/{id}` — full detail: all sheets (ordered), OCR text, detected questions per sheet
- `GET /submissions/{id}/questions` — merged question list from all sheets, matched against scheme

#### `app/routers/schemes.py`
- `POST /sessions/{id}/scheme` — upload scheme file (multipart). Parse it via `scheme_parser_service`. Store parsed questions as JSONB. Only one scheme per session.
- `GET /sessions/{id}/scheme` — retrieve parsed scheme

#### `app/routers/marking.py`
- `GET /sessions/{id}/marking` — teacher gets all submissions with scores overview (requires teacher assignment to session's class+course)
- `PUT /submissions/{id}/scores` — batch upsert scores. Body: `[{ question_number, awarded_marks, max_marks, comment }]`. `comment` is optional (nullable string). After saving, recompute `total_score` on submission. Update status to `in_progress` or `marked` (marked = all questions have a score).
- `PUT /submissions/{id}/scores/{question_number}/comment` — dedicated endpoint to save or update only the comment for a specific question without changing the score. Body: `{ comment: string | null }`. This allows the teacher to add or edit a comment independently of the scoring action.
- `GET /submissions/{id}/scores` — get all scores; each score object includes the `comment` field (null if not set)
- `GET /sessions/{id}/results` — all students, their total_score, max possible score, status

#### `app/routers/admin.py`
Build full admin CRUD endpoints for:
- `/admin/users` — CRUD, includes creating teachers/operators with role
- `/admin/schools`, `/admin/faculties`, `/admin/departments`
- `/admin/classes`, `/admin/courses`
- `/admin/assignments` — assign teacher to class+course pair
- All admin endpoints require `role = admin`

---

### 2.6 `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, admin, sessions, submissions, marking, schemes
from app.database import engine
from app import models

# Create all tables
models.user.Base.metadata.create_all(bind=engine)
models.institution.Base.metadata.create_all(bind=engine)
models.session.Base.metadata.create_all(bind=engine)
models.submission.Base.metadata.create_all(bind=engine)
models.marking.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ceres API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(sessions.router)
app.include_router(submissions.router)
app.include_router(marking.router)
app.include_router(schemes.router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

---

## 3. FRONTEND — React + TypeScript

### 3.1 Setup

Bootstrap with Vite:
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install axios zustand react-router-dom@6 imagekitio-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**`tailwind.config.js`** — extend with Ceres design tokens:
```js
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1D4ED8",
          light: "#DBEAFE",
          dark: "#1E40AF",
          mid: "#93C5FD",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Courier New", "monospace"],
      }
    }
  }
}
```

### 3.2 File Structure

```
frontend/src/
├── api/
│   ├── axios.ts
│   ├── auth.ts
│   ├── admin.ts
│   ├── sessions.ts
│   ├── submissions.ts
│   ├── marking.ts
│   └── schemes.ts
├── store/
│   ├── authStore.ts
│   ├── markingStore.ts
│   └── sessionStore.ts
├── types/
│   └── index.ts
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   ├── Spinner.tsx
│   │   ├── Table.tsx
│   │   └── Card.tsx
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   └── marking/
│       ├── StudentList.tsx
│       ├── QuestionDisplay.tsx
│       ├── OriginalImageView.tsx
│       ├── ScorePanel.tsx
│       └── KeyboardHandler.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   ├── UsersPage.tsx
│   │   ├── InstitutionsPage.tsx
│   │   └── AssignmentsPage.tsx
│   ├── operator/
│   │   ├── OperatorDashboard.tsx
│   │   ├── SessionPage.tsx
│   │   └── FlaggedSheetsPage.tsx
│   └── teacher/
│       ├── TeacherDashboard.tsx
│       ├── SessionOverviewPage.tsx
│       ├── SchemeUploadPage.tsx
│       └── MarkingPage.tsx
├── routes/
│   ├── AppRouter.tsx
│   └── ProtectedRoute.tsx
├── hooks/
│   ├── useMarkingKeyboard.ts
│   ├── useScoreSave.ts
│   └── useCommentSave.ts
├── utils/
│   └── markingHelpers.ts
└── main.tsx
```

---

### 3.3 API Layer

#### `src/api/axios.ts`
```typescript
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        await useAuthStore.getState().refreshTokens();
        const token = useAuthStore.getState().accessToken;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

#### `src/store/authStore.ts`
```typescript
import { create } from 'zustand';
import api from '../api/axios';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; name: string; role: string } | null;
  login: (email: string, password: string) => Promise<void>;
  refreshTokens: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,

  login: async (email, password) => {
    const form = new FormData();
    form.append('username', email);
    form.append('password', password);
    const { data } = await api.post('/auth/login', form);
    set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user: { id: data.sub, name: data.name, role: data.role }
    });
  },

  refreshTokens: async () => {
    const { data } = await api.post('/auth/refresh', { refresh_token: get().refreshToken });
    set({ accessToken: data.access_token });
  },

  logout: () => set({ accessToken: null, refreshToken: null, user: null }),
}));
```

#### `src/store/markingStore.ts`
```typescript
import { create } from 'zustand';

interface ScoreEntry {
  question_number: string;
  awarded_marks: number | null;
  max_marks: number;
  comment: string | null;  // Optional teacher comment
  saved: boolean;
  saving: boolean;
  error: boolean;
  commentSaving: boolean;
  commentSaved: boolean;
}

interface MarkingState {
  activeSubmissionId: string | null;
  activeQuestionIndex: number;
  showOriginalImage: boolean;
  scores: Record<string, ScoreEntry>; // keyed by question_number
  composingNumber: string; // for multi-digit keyboard input
  composingTimeout: ReturnType<typeof setTimeout> | null;

  setActiveSubmission: (id: string) => void;
  setActiveQuestion: (index: number) => void;
  toggleOriginalImage: () => void;
  initScores: (questions: { question_number: string; max_marks: number; awarded_marks: number | null; comment: string | null }[]) => void;
  setScore: (question_number: string, marks: number | null) => void;
  setComment: (question_number: string, comment: string | null) => void;
  markSaving: (question_number: string) => void;
  markSaved: (question_number: string) => void;
  markError: (question_number: string) => void;
  markCommentSaving: (question_number: string) => void;
  markCommentSaved: (question_number: string) => void;
  appendComposingDigit: (digit: string) => void;
  commitComposingNumber: () => string | null;
  clearComposing: () => void;
}

export const useMarkingStore = create<MarkingState>((set, get) => ({
  activeSubmissionId: null,
  activeQuestionIndex: 0,
  showOriginalImage: false,
  scores: {},
  composingNumber: "",
  composingTimeout: null,

  setActiveSubmission: (id) => set({ activeSubmissionId: id, activeQuestionIndex: 0, showOriginalImage: false }),
  setActiveQuestion: (index) => set({ activeQuestionIndex: index, composingNumber: "" }),
  toggleOriginalImage: () => set((s) => ({ showOriginalImage: !s.showOriginalImage })),

  initScores: (questions) => {
    const scores: Record<string, ScoreEntry> = {};
    for (const q of questions) {
      scores[q.question_number] = {
        question_number: q.question_number,
        awarded_marks: q.awarded_marks,
        max_marks: q.max_marks,
        comment: q.comment,
        saved: q.awarded_marks !== null,
        saving: false,
        error: false,
        commentSaving: false,
        commentSaved: q.comment !== null,
      };
    }
    set({ scores });
  },

  setScore: (qn, marks) => set((s) => ({
    scores: { ...s.scores, [qn]: { ...s.scores[qn], awarded_marks: marks, saved: false } }
  })),

  setComment: (qn, comment) => set((s) => ({
    scores: { ...s.scores, [qn]: { ...s.scores[qn], comment, commentSaved: false } }
  })),

  markSaving: (qn) => set((s) => ({ scores: { ...s.scores, [qn]: { ...s.scores[qn], saving: true, error: false } } })),
  markSaved: (qn) => set((s) => ({ scores: { ...s.scores, [qn]: { ...s.scores[qn], saving: false, saved: true } } })),
  markError: (qn) => set((s) => ({ scores: { ...s.scores, [qn]: { ...s.scores[qn], saving: false, error: true } } })),
  markCommentSaving: (qn) => set((s) => ({ scores: { ...s.scores, [qn]: { ...s.scores[qn], commentSaving: true } } })),
  markCommentSaved: (qn) => set((s) => ({ scores: { ...s.scores, [qn]: { ...s.scores[qn], commentSaving: false, commentSaved: true } } })),

  appendComposingDigit: (digit) => {
    const { composingTimeout } = get();
    if (composingTimeout) clearTimeout(composingTimeout);
    const timeout = setTimeout(() => get().commitComposingNumber(), 800);
    set((s) => ({ composingNumber: s.composingNumber + digit, composingTimeout: timeout }));
  },

  commitComposingNumber: () => {
    const { composingNumber } = get();
    set({ composingNumber: "", composingTimeout: null });
    return composingNumber || null;
  },

  clearComposing: () => {
    const { composingTimeout } = get();
    if (composingTimeout) clearTimeout(composingTimeout);
    set({ composingNumber: "", composingTimeout: null });
  },
}));
```

---

### 3.4 Keyboard Marking Hook

#### `src/hooks/useMarkingKeyboard.ts`
```typescript
import { useEffect } from 'react';
import { useMarkingStore } from '../store/markingStore';
import { useScoreSave } from './useScoreSave';

interface Question {
  question_number: string;
  max_marks: number;
}

export function useMarkingKeyboard(questions: Question[]) {
  const {
    activeQuestionIndex, setActiveQuestion, scores,
    setScore, appendComposingDigit, commitComposingNumber, clearComposing,
  } = useMarkingStore();
  const { saveScore } = useScoreSave();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in a text input or comment textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const question = questions[activeQuestionIndex];
      if (!question) return;

      const { max_marks, question_number } = question;

      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          clearComposing();
          setScore(question_number, max_marks);
          saveScore(question_number, max_marks, max_marks);
          break;

        case 'h':
          e.preventDefault();
          clearComposing();
          const half = Math.round(max_marks / 2 * 2) / 2; // round to 0.5
          setScore(question_number, half);
          saveScore(question_number, half, max_marks);
          break;

        case 'backspace':
          e.preventDefault();
          clearComposing();
          setScore(question_number, null);
          break;

        case 'tab':
          e.preventDefault();
          const committed = commitComposingNumber();
          if (committed) {
            const num = parseFloat(committed);
            if (!isNaN(num) && num <= max_marks) {
              setScore(question_number, num);
              saveScore(question_number, num, max_marks);
            }
          }
          if (e.shiftKey) {
            setActiveQuestion(Math.max(0, activeQuestionIndex - 1));
          } else {
            setActiveQuestion(Math.min(questions.length - 1, activeQuestionIndex + 1));
          }
          break;

        case 'enter':
          e.preventDefault();
          const num = parseFloat(commitComposingNumber() || '');
          if (!isNaN(num) && num <= max_marks) {
            setScore(question_number, num);
            saveScore(question_number, num, max_marks);
          }
          setActiveQuestion(Math.min(questions.length - 1, activeQuestionIndex + 1));
          break;

        default:
          if (/^\d$/.test(e.key)) {
            e.preventDefault();
            appendComposingDigit(e.key);
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeQuestionIndex, questions]);
}
```

#### `src/hooks/useScoreSave.ts`
```typescript
import { useMarkingStore } from '../store/markingStore';
import api from '../api/axios';

export function useScoreSave() {
  const { activeSubmissionId, markSaving, markSaved, markError } = useMarkingStore();

  const saveScore = async (question_number: string, awarded_marks: number, max_marks: number) => {
    if (!activeSubmissionId) return;
    markSaving(question_number);
    try {
      await api.put(`/submissions/${activeSubmissionId}/scores`, [
        { question_number, awarded_marks, max_marks }
      ]);
      markSaved(question_number);
    } catch {
      markError(question_number);
    }
  };

  return { saveScore };
}
```

#### `src/hooks/useCommentSave.ts`
```typescript
import { useMarkingStore } from '../store/markingStore';
import api from '../api/axios';

export function useCommentSave() {
  const { activeSubmissionId, setComment, markCommentSaving, markCommentSaved } = useMarkingStore();

  const saveComment = async (question_number: string, comment: string | null) => {
    if (!activeSubmissionId) return;
    setComment(question_number, comment);
    markCommentSaving(question_number);
    try {
      await api.put(`/submissions/${activeSubmissionId}/scores/${question_number}/comment`, { comment });
      markCommentSaved(question_number);
    } catch {
      // Comment save failure is non-critical — do not show error state, just log
      console.error('Failed to save comment for', question_number);
      markCommentSaved(question_number); // optimistic — keep local state
    }
  };

  return { saveComment };
}
```

---

### 3.5 Pages

#### `src/pages/LoginPage.tsx`
Standard login form. Email + password fields. On submit calls `authStore.login()`. On success redirect based on role:
- `admin` → `/admin`
- `teacher` → `/teacher`
- `scanner_operator` → `/operator`

Show error message on failure. Blue primary button. White background. Centered card layout.

#### `src/pages/teacher/MarkingPage.tsx`
This is the most important page. Build it as follows:

**Three-panel layout using CSS Grid: `grid-cols-[240px_1fr_320px]`**

**Left Panel — `StudentList` component:**
- Fetches all submissions for the session
- Renders a scrollable list; each item shows: student ID, status badge, total score / max score, progress bar (questions scored / total questions)
- Active student highlighted with primary blue background
- Click or arrow keys navigate between students
- When a new student is selected, call `markingStore.setActiveSubmission()` and fetch that student's questions + scores

**Centre Panel — `QuestionDisplay` component:**
- Shows the currently active question's OCR text content in a `font-mono` text area with good line-height
- A toggle button at top-right switches between OCR Text and Original Image
- In OCR mode: display extracted question text; below it, a collapsible "Marking Scheme Answer" section showing the expected answer from the scheme
- In Image mode: use `OriginalImageView` component — loads ImageKit images for the sheet(s) containing the active question; stacked vertically if multiple sheets; shows full resolution via ImageKit URL parameters

**Right Panel — `ScorePanel` component:**
- Lists all questions from the scheme
- Each question row: question label, max marks chip, awarded marks display, save indicator (saving spinner / saved checkmark / error icon)
- Below the score input on each active question row, render a comment textarea: placeholder "Add a comment for this question…", max 500 characters. The textarea only expands and becomes editable when the question row is active (collapsed/hidden for inactive rows to keep the panel clean).
- Comment saves automatically when the teacher stops typing — use a 1000ms debounce then call `useCommentSave`. Show a small "Saved" indicator next to the textarea on success.
- If a question already has a saved comment, show a small comment icon next to the question label in the list even when it's not the active row, so the teacher can see at a glance which questions have notes.
- Active question row is highlighted with `bg-primary-light border-l-4 border-primary`
- Clicking a question row sets it as active
- Running total displayed at top: `Total: X / Y` in large text
- Keyboard shortcut hints shown at bottom of panel: small grey text listing F, H, 0-9, Tab, Enter shortcuts. Also note: Tab/Enter moves focus to next question — to type in the comment box, click it directly (keyboard shortcuts are disabled while the comment textarea is focused).

#### `src/pages/teacher/SchemeUploadPage.tsx`
- Drag-and-drop or click-to-upload area for PDF/Word file
- On upload, POST to `/sessions/{id}/scheme`
- Show parsed questions in a preview table: Question No. | Max Marks | Expected Answer (truncated)
- Teacher confirms or re-uploads
- If session already has a scheme, show existing and offer re-upload option

#### `src/pages/operator/FlaggedSheetsPage.tsx`
- Lists all flagged sheets for the session
- Each row shows: upload order, a thumbnail of the scan (ImageKit), raw extracted ID (or "Not detected"), input field to manually enter correct student ID
- On submit, calls `PUT /sessions/{id}/sheets/{sheet_id}/resolve`
- Shows sheet count remaining

#### All Admin Pages
Build standard data tables with Create/Edit/Delete modals. Keep it clean and functional. Use the `Table`, `Modal`, `Button`, `Input` UI components.

---

### 3.6 Routes

#### `src/routes/AppRouter.tsx`
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from './ProtectedRoute';
// import all pages...

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/*" element={<ProtectedRoute role="admin"><AdminRoutes /></ProtectedRoute>} />
        <Route path="/teacher/*" element={<ProtectedRoute role="teacher"><TeacherRoutes /></ProtectedRoute>} />
        <Route path="/operator/*" element={<ProtectedRoute role="scanner_operator"><OperatorRoutes /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

#### `src/routes/ProtectedRoute.tsx`
Checks `authStore.user?.role`. If not authenticated, redirect to `/login`. If authenticated but wrong role, redirect to their correct portal.

---

### 3.7 UI Components

Build these reusable components in `src/components/ui/`. They must follow the design system strictly (blue + white only):

**`Button`** — variants: `primary` (blue bg, white text), `secondary` (white bg, blue border + text), `ghost` (transparent, blue text). Sizes: `sm`, `md`, `lg`. Always include a loading state prop that shows a spinner.

**`Badge`** — variants by status: `pending` (gray), `in_progress` (blue), `marked` (green), `flagged` (amber). Pill shape, small text.

**`Input`** — blue focus ring, clean border, label above. Error state with red border + message below.

**`Modal`** — centered overlay, white card, blue header bar, close button top-right.

**`Table`** — alternating row shading (white / gray-50), blue header row, clean borders.

**`Spinner`** — blue spinning circle, size variants.

---

## 4. MOBILE — Flutter

### 4.1 Setup

```
mobile/
├── lib/
│   ├── main.dart
│   ├── config/
│   │   └── app_config.dart
│   ├── models/
│   │   ├── session.dart
│   │   ├── sheet.dart
│   │   └── user.dart
│   ├── services/
│   │   ├── auth_service.dart
│   │   ├── api_service.dart
│   │   ├── ocr_service.dart
│   │   └── imagekit_service.dart
│   ├── providers/
│   │   ├── auth_provider.dart
│   │   └── session_provider.dart
│   └── screens/
│       ├── login_screen.dart
│       ├── session_screen.dart
│       ├── scan_screen.dart
│       └── session_summary_screen.dart
├── pubspec.yaml
└── README.md
```

**`pubspec.yaml` dependencies:**
```yaml
dependencies:
  flutter:
    sdk: flutter
  provider: ^6.1.2
  http: ^1.2.1
  camera: ^0.10.5+9
  image_picker: ^1.1.2
  flutter_secure_storage: ^9.0.0
  dio: ^5.4.3+1
  shared_preferences: ^2.2.3
```

---

### 4.2 Auth Flow

`auth_service.dart` — POST to `/auth/login` with email/password. Store JWT in `flutter_secure_storage`. Attach token to all subsequent requests via Dio interceptor. Same refresh logic as frontend.

---

### 4.3 Session Flow

**`session_screen.dart`:**
- On load, fetch available Class and Course lists from backend
- Two dropdowns: select Class, then select Course (filtered by department)
- "Start Session" button — POST to `/sessions` — stores returned session ID
- Navigate to scan screen once session is created

**`scan_screen.dart`:**
- Shows camera preview (using `camera` package)
- Large blue "Capture" button at bottom
- On capture:
  1. Show captured image preview with "Use this" / "Retake" options
  2. On confirm: upload image to ImageKit via `imagekit_service.dart` — get back image URL
  3. Send image URL to Chandra OCR API via `ocr_service.dart` — get back `ocr_text` and `ocr_metadata`
  4. POST to `/sessions/{id}/sheets` with: `{ image_url, ocr_text, ocr_metadata, upload_order }`
  5. If response has `flagged: true`, show a brief amber banner: "Sheet flagged — student ID unclear"
  6. If success: show green checkmark briefly, increment counter, ready for next sheet
  7. Keep a running count of sheets captured in the session
- "End Session" button — PUT to `/sessions/{id}/close` — navigate to summary

**`session_summary_screen.dart`:**
- Shows total sheets scanned
- Shows count of flagged sheets (with note to resolve in web portal)
- "Done" button returns to session screen

---

### 4.4 OCR Service

**`ocr_service.dart`:**
```dart
// POST image URL to Chandra OCR API
// Request: { "image_url": "...", "api_key": "..." }
// Response: { "text": "...", "metadata": { "blocks": [...], "page_width": ..., "page_height": ... } }
// Return OcrResult(text, metadata)
```

Use Dio for HTTP. Include error handling — if OCR fails, allow operator to upload sheet anyway with `ocr_text: null` and `flagged: true`.

---

## 5. GENERAL RULES FOR CLAUDE CODE

Follow these rules throughout the entire build:

### Code Quality
- TypeScript strict mode on the frontend — no `any` types
- All API calls wrapped in try/catch with proper error handling
- Loading states on every async operation
- Empty states on every list (no blank screens)

### Security
- Never store JWT access token in localStorage — keep in Zustand memory only
- Refresh tokens can go in httpOnly cookies or secure storage (Flutter)
- All backend endpoints enforce role checks — never trust the frontend for authorization
- Validate all inputs server-side regardless of frontend validation

### Error Handling
- Backend: return consistent error responses: `{ "detail": "message" }` (FastAPI default)
- Frontend: Axios interceptor logs and surfaces errors; critical errors show a toast/banner
- Mobile: Dio interceptor handles token refresh; network errors queue uploads for retry

### Database
- Use Alembic for all migrations — never use `create_all` in production (dev only in main.py)
- Add indexes on: `sheets.session_id`, `submissions.student_id`, `submissions.session_id`, `question_scores.submission_id`
- Use UUIDs for all primary keys

### Design (Frontend)
- Only blue (`#1D4ED8` and its shades) and white as brand colours
- No other accent colours except semantic: green for success, amber for warning, red for error
- Marking page must be visually clean — maximum white space, OCR text is the focus
- All interactive elements must have visible keyboard focus states (blue ring)
- Font: Inter for UI text, monospace for OCR text display

### Environment Variables
Frontend `.env`:
```
VITE_API_URL=http://localhost:8000
VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
VITE_IMAGEKIT_PUBLIC_KEY=your_public_key
```

Backend `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/ceres
SECRET_KEY=your-secret-key-min-32-chars
IMAGEKIT_PUBLIC_KEY=your_key
IMAGEKIT_PRIVATE_KEY=your_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
CHANDRA_OCR_API_URL=https://api.chandra-ocr.com/v1/extract
CHANDRA_OCR_API_KEY=your_key
```

---

## 6. BUILD ORDER CHECKLIST

Follow this exact order. Do not start a step until the previous is done and tested:

### Backend
- [ ] Project setup, config, database connection
- [ ] All SQLAlchemy models created
- [ ] Alembic migration generated and applied
- [ ] Auth endpoints working (login, refresh)
- [ ] Admin CRUD endpoints (users, institutions, assignments)
- [ ] Session creation and management
- [ ] Sheet upload + grouping service
- [ ] Student ID extractor + question detector utilities
- [ ] Submission endpoints
- [ ] Marking scheme upload + parser service
- [ ] Marking (score save) endpoints
- [ ] Results summary endpoint

### Frontend
- [ ] Vite setup, Tailwind configured, design tokens set
- [ ] Axios instance + Zustand auth store
- [ ] Login page + routing + protected routes
- [ ] All UI primitives (Button, Badge, Input, Modal, Table, Spinner)
- [ ] Admin portal (users, institutions, assignments)
- [ ] Operator portal (session management, flagged sheets)
- [ ] Teacher dashboard + session overview
- [ ] Scheme upload page
- [ ] Marking page — student list panel
- [ ] Marking page — question display panel + image toggle
- [ ] Marking page — score panel with comment textarea per question
- [ ] Keyboard handler hook wired up
- [ ] Score save hook with retry logic
- [ ] Comment save hook with debounce

### Mobile
- [ ] Flutter project setup, dependencies
- [ ] Auth service + login screen
- [ ] Session creation screen (class/course selection)
- [ ] Camera capture screen
- [ ] ImageKit upload service
- [ ] OCR service integration
- [ ] Sheet upload + flag handling
- [ ] Session summary screen

---

## 7. NOTES & EDGE CASES TO HANDLE

- **Scheme parsing fallback:** The PDF/Word parser may fail on poorly formatted documents. If `_parse_scheme_text` returns an empty list, do NOT silently fail — return a 422 with message: `"Could not parse questions from this document. Please ensure questions are labelled as Q1, Question 1, etc. with marks in parentheses e.g. (10 marks)"`.

- **Multi-sheet students:** A student's submission may have 2, 3, or more sheets. The `QuestionDisplay` component must merge detected questions across all sheets for that student. When toggling to original image view, show the sheet that contains the position of the selected question based on OCR metadata.

- **Duplicate student IDs in a session:** If two different sheets have the same confirmed student ID, they are grouped under one submission (this is correct — one student, multiple sheets). If the operator accidentally assigns the same ID to two sheets that clearly belong to different students, there is no automated fix — the admin must handle this manually. Surface a warning in the session overview if any submission has more sheets than expected (e.g., > 4 sheets).

- **Questions in scheme not found in student script:** The marking interface should still show the question from the scheme in the score panel so the teacher can award 0 and not get stuck. Indicate clearly: "No answer found for this question."

- **Score for partial marks:** The keyboard system supports `F` (full), `H` (half), and numeric input. Half marks are rounded to nearest 0.5. The backend stores marks as `Float` to support 0.5 increments. The frontend should display half marks as `0.5`, `1.5`, `2.5` etc., not as decimals like `1.500`.

- **Session close guard:** If a session has flagged sheets that have not been resolved, warn the operator before allowing them to close the session. Do not hard-block — just a confirmation dialog.

- **Teacher access guard:** A teacher can only access sessions for Class-Course pairs they are assigned to. Enforce this in the backend on every `/sessions/{id}` endpoint by checking the teacher's assignments against the session's `class_id` and `course_id`.

- **Question comments and keyboard focus:** The keyboard shortcut system (F, H, numbers, Tab, Enter) must be fully disabled whenever the comment textarea is focused. This is already handled by the TEXTAREA check in `useMarkingKeyboard`, but ensure the comment textarea is a native `<textarea>` element so the check works correctly. Do not use a contentEditable div for the comment field. Comment saves use a 1000ms debounce — do not save on every keystroke. If a teacher navigates away from a question before the debounce fires, cancel the pending timeout and fire the save immediately on question change.
