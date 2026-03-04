"""
Sample session seeder — creates a realistic closed scan session with student
submissions and a marking scheme so a teacher can immediately start evaluating.

Run from the backend/ directory:
    python sample_session.py

Credentials:
    Teacher:  teacher@ceres.app  / teacher123
    Admin:    admin@ceres.app    / admin123
    Operator: operator@ceres.app / operator123
"""
import sys
import os
import json

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.institution import Class, Course
from app.models.session import ScanSession, SessionStatus
from app.models.submission import Sheet, Submission, SubmissionStatus
from app.models.marking import MarkingScheme, QuestionScore

# ── Marking scheme: 3 questions, 50 marks total ────────────────────────────────

SCHEME_QUESTIONS = [
    {
        "question_number": 1,
        "label_variants": ["Q1", "Q. 1", "Question 1"],
        "max_marks": 10.0,
        "question_text": "What is the time complexity of binary search? Explain your answer.",
        "expected_answer": (
            "Binary search operates by repeatedly halving the search space. "
            "Time complexity: O(log n) — each step eliminates half the remaining elements. "
            "Best case O(1) when the middle element is the target. Space complexity O(1) iterative, O(log n) recursive."
        ),
    },
    {
        "question_number": 2,
        "label_variants": ["Q2", "Q. 2", "Question 2"],
        "max_marks": 20.0,
        "question_text": (
            "Explain the difference between Breadth-First Search (BFS) and Depth-First Search (DFS). "
            "Include data structures used, traversal order, and suitable use cases for each."
        ),
        "expected_answer": (
            "BFS (Breadth-First Search) explores all neighbours of a node before moving deeper, "
            "uses a queue, finds shortest path in unweighted graphs, O(V+E) time and O(V) space. "
            "DFS (Depth-First Search) explores as deep as possible before backtracking, uses a stack "
            "(or recursion), O(V+E) time and O(V) space. BFS is better for shortest paths; "
            "DFS is better for cycle detection, topological sort, and connectivity."
        ),
    },
    {
        "question_number": 3,
        "label_variants": ["Q3", "Q. 3", "Question 3"],
        "max_marks": 20.0,
        "question_text": (
            "Write the pseudocode for the Merge Sort algorithm. "
            "State its time and space complexity and explain whether it is a stable sort."
        ),
        "expected_answer": (
            "MERGE_SORT(A, left, right):\n"
            "  if left >= right: return\n"
            "  mid = (left + right) // 2\n"
            "  MERGE_SORT(A, left, mid)\n"
            "  MERGE_SORT(A, mid+1, right)\n"
            "  MERGE(A, left, mid, right)\n"
            "Time: O(n log n). Space: O(n). Stable sort."
        ),
    },
]

# ── Student answers ────────────────────────────────────────────────────────────
# OCR text format must match question_detector.py regex:
#   (Q|Question|QUESTION)\s*\.?\s*(\d+)
# Text after each label until the next label is the student's answer.

STUDENTS = [
    {
        "student_id": "20210001",
        "name": "Kwame Mensah",
        # Page 1: Q1 + Q2; Page 2: Q3
        "pages": [
            (
                "Student ID: 20210001                    Name: Kwame Mensah\n"
                "CS301 — Algorithm Design                Date: 15/01/2025\n\n"
                "Q1\n"
                "Binary search has a time complexity of O(log n). This is because with each comparison "
                "we eliminate half of the remaining elements. In the best case it is O(1) when the "
                "middle element happens to be the target. In the worst case we need log₂(n) steps. "
                "Space complexity is O(1) for the iterative version.\n\n"
                "Q2\n"
                "BFS and DFS are two fundamental graph traversal algorithms.\n"
                "BFS uses a queue and visits all nodes at the current depth before moving deeper. "
                "It is ideal for finding the shortest path in unweighted graphs.\n"
                "DFS uses a stack (or recursion) and goes as deep as possible along a branch before "
                "backtracking. It is useful for detecting cycles, topological sorting, and checking "
                "connectivity. Both have O(V + E) time complexity.\n"
            ),
            (
                "Student ID: 20210001                    Page 2\n\n"
                "Q3\n"
                "MERGE_SORT(A, left, right):\n"
                "    if left >= right:\n"
                "        return\n"
                "    mid = (left + right) // 2\n"
                "    MERGE_SORT(A, left, mid)\n"
                "    MERGE_SORT(A, mid + 1, right)\n"
                "    MERGE(A, left, mid, right)\n\n"
                "MERGE combines two sorted halves into one sorted array.\n"
                "Time complexity: O(n log n) — there are log n levels each requiring O(n) work.\n"
                "Space complexity: O(n) auxiliary. Merge sort is a stable sort.\n"
            ),
        ],
    },
    {
        "student_id": "20210002",
        "name": "Akosua Boateng",
        "pages": [
            (
                "Student ID: 20210002                    Name: Akosua Boateng\n"
                "CS301 — Algorithm Design\n\n"
                "Q1\n"
                "The time complexity of binary search is O(log n). Because each step divides the "
                "array in half, we need at most log₂(n) comparisons to find the target.\n\n"
                "Q2\n"
                "BFS explores neighbours level by level using a queue data structure. "
                "It guarantees the shortest path in an unweighted graph.\n"
                "DFS explores one path fully before trying another, using a stack or recursion. "
                "DFS is used for topological sorting and cycle detection.\n"
                "The main difference is in the order of exploration: BFS is level-by-level, "
                "DFS is depth-first.\n\n"
                "Q3\n"
                "Merge sort pseudocode:\n"
                "  if array has 1 element, return\n"
                "  split array into left and right halves\n"
                "  recursively sort left half\n"
                "  recursively sort right half\n"
                "  merge both sorted halves\n"
                "Time: O(n log n). Not in-place — requires O(n) extra space.\n"
            ),
        ],
    },
    {
        "student_id": "20210003",
        "name": "Kofi Anning",
        "pages": [
            (
                "Student ID: 20210003                    Name: Kofi Anning\n"
                "CS301 — Algorithm Design\n\n"
                "Q1\n"
                "Binary search complexity is O(log n) because it halves the search space each step.\n\n"
                "Q2\n"
                "BFS visits nodes in breadth-first order using a queue.\n"
                "DFS visits depth-first using a stack.\n"
                "BFS finds shortest paths, DFS good for exploring all paths.\n"
            ),
            # Page 2 — Q3 not attempted
            (
                "Student ID: 20210003                    Page 2\n\n"
                "[Page left blank — no answer provided for question 3]\n"
            ),
        ],
    },
    {
        "student_id": "20210004",
        "name": "Abena Frimpong",
        "pages": [
            (
                "Student ID: 20210004                    Name: Abena Frimpong\n"
                "CS301 — Algorithm Design\n\n"
                "Q1\n"
                "Binary search works on sorted arrays. At each step we compare the target with the "
                "middle element and discard the half that cannot contain it. Time complexity: O(log n).\n\n"
                "Q2\n"
                "BFS: Breadth First Search. Uses queue. Explores level by level. Good for shortest path.\n"
                "DFS: Depth First Search. Uses stack or recursion. Goes deep first. Good for cycle detection "
                "and topological sort. Both are O(V + E) time and O(V) space.\n\n"
                "Q3\n"
                "function mergeSort(arr):\n"
                "    if length(arr) <= 1: return arr\n"
                "    mid = length(arr) / 2\n"
                "    left = mergeSort(arr[0..mid])\n"
                "    right = mergeSort(arr[mid+1..])\n"
                "    return merge(left, right)\n"
                "Time complexity O(n log n). Stable and divide-and-conquer algorithm.\n"
            ),
        ],
    },
    {
        "student_id": "20210005",
        "name": "Yaw Darko",
        "pages": [
            (
                "Student ID: 20210005                    Name: Yaw Darko\n"
                "CS301 — Algorithm Design\n\n"
                "Q1\n"
                "O(log n) — binary search divides array in half each iteration.\n\n"
                "Q2\n"
                "BFS uses queue, level-by-level. DFS uses stack, depth-first. "
                "BFS finds shortest path. DFS explores all possibilities.\n\n"
                "Q3\n"
                "Merge sort: divide the array into halves, sort each half recursively, then merge.\n"
                "merge_sort(A):\n"
                "  if len(A) == 1: return A\n"
                "  L = merge_sort(A[:n//2])\n"
                "  R = merge_sort(A[n//2:])\n"
                "  return merge(L, R)\n"
                "O(n log n) time, O(n) space, stable.\n"
            ),
        ],
    },
    {
        "student_id": "20210006",
        "name": "Ama Sarpong",
        "pages": [
            (
                "Student ID: 20210006                    Name: Ama Sarpong\n"
                "CS301 — Algorithm Design\n\n"
                "Q1\n"
                "Binary search time complexity is O(log n). The algorithm works on a sorted array by "
                "comparing the search key with the middle element. If equal, done (O(1) best case). "
                "If key < mid, recurse left half; else recurse right half. Each step halves the problem "
                "size, giving log₂(n) levels. Iterative space O(1), recursive space O(log n).\n\n"
                "Q2\n"
                "BFS (Breadth-First Search):\n"
                "  - Uses a queue (FIFO)\n"
                "  - Explores all nodes at depth d before depth d+1\n"
                "  - Guarantees shortest path in unweighted graphs\n"
                "  - Good for: shortest path, level-order traversal, connected components\n\n"
                "DFS (Depth-First Search):\n"
                "  - Uses a stack (LIFO) or recursion\n"
                "  - Explores one path fully before backtracking\n"
                "  - Good for: cycle detection, topological sort, strongly connected components\n"
                "  - Both: O(V + E) time, O(V) space\n\n"
                "Q3\n"
                "MERGE_SORT(A, p, r):\n"
                "  if p < r:\n"
                "    q = floor((p + r) / 2)\n"
                "    MERGE_SORT(A, p, q)\n"
                "    MERGE_SORT(A, q+1, r)\n"
                "    MERGE(A, p, q, r)\n\n"
                "MERGE(A, p, q, r):\n"
                "  Copy A[p..q] into L, A[q+1..r] into R\n"
                "  Merge L and R back into A[p..r] in sorted order\n\n"
                "Analysis: T(n) = 2T(n/2) + O(n) => T(n) = O(n log n) by Master theorem.\n"
                "Space: O(n) auxiliary. Stable sort. Not in-place.\n"
            ),
        ],
    },
]


def seed_sample_session():
    db = SessionLocal()
    try:
        # ── Check for existing sample session ───────────────────────────────────
        operator = db.query(User).filter(User.email == "operator@ceres.app").first()
        teacher = db.query(User).filter(User.email == "teacher@ceres.app").first()

        if not operator or not teacher:
            print("ERROR: Run seed.py first to create users.")
            return

        cls = db.query(Class).filter(Class.name == "CS Level 300").first()
        course = db.query(Course).filter(Course.code == "CS301").first()

        if not cls or not course:
            print("ERROR: Run seed.py first to create institution data.")
            return

        existing = (
            db.query(ScanSession)
            .filter(
                ScanSession.operator_id == operator.id,
                ScanSession.class_id == cls.id,
                ScanSession.course_id == course.id,
            )
            .first()
        )
        if existing:
            print(f"Sample session already exists (id={existing.id}). Skipping.")
            print(f"\nSession ID: {existing.id}")
            _print_summary(db, existing)
            return

        # ── Create closed scan session ──────────────────────────────────────────
        session = ScanSession(
            operator_id=operator.id,
            class_id=cls.id,
            course_id=course.id,
            status=SessionStatus.closed,
        )
        db.add(session)
        db.flush()
        print(f"Created scan session: {session.id}")

        # ── Create submissions + sheets ─────────────────────────────────────────
        for student in STUDENTS:
            submission = Submission(
                session_id=session.id,
                student_id=student["student_id"],
                status=SubmissionStatus.pending,
            )
            db.add(submission)
            db.flush()

            for order, page_text in enumerate(student["pages"], start=1):
                sheet = Sheet(
                    session_id=session.id,
                    submission_id=submission.id,
                    student_id_raw=student["student_id"],
                    student_id_confirmed=student["student_id"],
                    image_url=f"https://placeholder.ceres.local/sheets/{submission.id}/page{order}.jpg",
                    ocr_text=page_text,
                    ocr_metadata={"source": "sample_seed", "student_name": student["name"]},
                    id_confidence=0.97,
                    flagged=False,
                    upload_order=order,
                )
                db.add(sheet)

            print(f"  + Student {student['student_id']} ({student['name']}) — {len(student['pages'])} page(s)")

        # ── Create marking scheme ────────────────────────────────────────────────
        scheme = MarkingScheme(
            session_id=session.id,
            teacher_id=teacher.id,
            original_file_url="https://placeholder.ceres.local/schemes/cs301_jan2025.pdf",
            questions=SCHEME_QUESTIONS,
        )
        db.add(scheme)
        print(f"Created marking scheme with {len(SCHEME_QUESTIONS)} questions (total: 50 marks)")

        db.commit()

        print(f"\nSample session seeded successfully.")
        _print_summary(db, session)

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


def _print_summary(db, session):
    submissions = db.query(Submission).filter(Submission.session_id == session.id).all()
    scheme = db.query(MarkingScheme).filter(MarkingScheme.session_id == session.id).first()

    max_marks = sum(q["max_marks"] for q in scheme.questions) if scheme else 0

    print("\n" + "─" * 60)
    print(f"SESSION ID : {session.id}")
    print(f"Course     : CS301 — Algorithm Design")
    print(f"Class      : CS Level 300 (2024/2025)")
    print(f"Status     : {session.status.value}")
    print(f"Scheme     : {len(scheme.questions) if scheme else 0} questions / {max_marks:.0f} marks total")
    print(f"Submissions: {len(submissions)} students")
    print("─" * 60)
    for sub in submissions:
        scored = sum(1 for s in sub.scores if s.awarded_marks is not None)
        print(f"  {sub.student_id:<12} status={sub.status.value:<12} score={sub.total_score or '—'}")
    print("─" * 60)
    print("\nLogin as teacher to start marking:")
    print("  Email   : teacher@ceres.app")
    print("  Password: teacher123")
    print("\nAPI base  : http://localhost:8000")
    print("API docs  : http://localhost:8000/docs")
    print("Frontend  : http://localhost:5173")


if __name__ == "__main__":
    seed_sample_session()
