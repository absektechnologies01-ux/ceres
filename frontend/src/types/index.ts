// ─── User & Auth ───────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'teacher' | 'scanner_operator';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: UserRole;
  name: string;
}

// ─── Institution ───────────────────────────────────────────────────────────────

export interface School {
  id: string;
  name: string;
  created_at: string;
}

export interface Faculty {
  id: string;
  name: string;
  school_id: string;
  created_at: string;
  school?: School;
}

export interface Department {
  id: string;
  name: string;
  faculty_id: string;
  created_at: string;
  faculty?: Faculty;
}

export interface Class {
  id: string;
  name: string;
  department_id: string;
  academic_year: string;
  created_at: string;
  department?: Department;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  department_id: string;
  created_at: string;
  department?: Department;
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  course_id: string;
  created_at: string;
  teacher?: User;
  class_?: Class;
  course?: Course;
}

// ─── Sessions ──────────────────────────────────────────────────────────────────

export type SessionStatus = 'active' | 'closed';

export interface ScanSession {
  id: string;
  operator_id: string;
  class_id: string;
  course_id: string;
  status: SessionStatus;
  created_at: string;
  submission_count: number;
  has_scheme: boolean;
  operator?: User;
  class_?: Class;
  course?: Course;
}

// ─── Sheets & Submissions ──────────────────────────────────────────────────────

export type SubmissionStatus = 'pending' | 'in_progress' | 'marked';

export interface Sheet {
  id: string;
  session_id: string;
  submission_id: string | null;
  student_id_raw: string | null;
  student_id_confirmed: string | null;
  image_url: string;
  ocr_text: string | null;
  ocr_metadata: OcrMetadata | null;
  id_confidence: number | null;
  flagged: boolean;
  upload_order: number;
  created_at: string;
}

export interface OcrMetadata {
  blocks?: OcrBlock[];
  page_width?: number;
  page_height?: number;
}

export interface OcrBlock {
  text: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Submission {
  id: string;
  session_id: string;
  student_id: string;
  status: SubmissionStatus;
  total_score: number | null;
  created_at: string;
  sheets?: Sheet[];
  scores?: QuestionScore[];
}

// ─── Marking ───────────────────────────────────────────────────────────────────

export interface MarkingScheme {
  id: string;
  session_id: string;
  teacher_id: string;
  original_file_url: string;
  questions: SchemeQuestion[];
  created_at: string;
}

export interface SchemeQuestion {
  question_number: string;
  label_variants: string[];
  max_marks: number;
  question_text?: string;
  expected_answer: string;
  sub_questions: SchemeQuestion[];
}

export interface QuestionScore {
  id: string;
  submission_id: string;
  question_number: string;
  awarded_marks: number | null;
  max_marks: number;
  comment: string | null;
  marked_at: string | null;
  teacher_id: string;
}

export interface DetectedQuestion {
  label: string;
  question_number: string;
  start_pos: number;
  text_content: string;
  sheet_id?: string;
}

export interface SubmissionQuestion {
  question_number: string;
  label: string;
  question_text: string | null;
  text_content: string;
  max_marks: number;
  expected_answer: string;
  awarded_marks: number | null;
  comment: string | null;
  sheet_id: string | null;
}

// ─── Results ───────────────────────────────────────────────────────────────────

export interface SessionResult {
  student_id: string;
  total_score: number | null;
  max_possible: number;
  status: SubmissionStatus;
  submission_id: string;
}

// ─── Pagination / List responses ───────────────────────────────────────────────

export interface ApiError {
  detail: string;
}
