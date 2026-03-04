import { useMarkingKeyboard } from '../../hooks/useMarkingKeyboard';
import type { Submission, SubmissionQuestion } from '../../types';

interface KeyboardHandlerProps {
  questions: SubmissionQuestion[];
  submissions: Submission[];
  onSelectStudent: (id: string) => void;
}

/**
 * Invisible component that attaches the keyboard handler when mounted.
 */
export default function KeyboardHandler({ questions, submissions, onSelectStudent }: KeyboardHandlerProps) {
  useMarkingKeyboard(
    questions.map((q) => ({ question_number: q.question_number, max_marks: q.max_marks })),
    submissions,
    onSelectStudent,
  );
  return null;
}
