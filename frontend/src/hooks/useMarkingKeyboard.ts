import { useEffect } from 'react';
import { useMarkingStore } from '../store/markingStore';
import { useToastStore } from '../store/toastStore';
import { useScoreSave } from './useScoreSave';
import { roundToHalf } from '../utils/markingHelpers';
import type { Submission } from '../types';

interface Question {
  question_number: string;
  max_marks: number;
}

export function useMarkingKeyboard(
  questions: Question[],
  submissions: Submission[],
  onSelectStudent: (id: string) => void,
) {
  const {
    activeSubmissionId,
    activeQuestionIndex,
    setActiveQuestion,
    setScore,
    appendComposingDigit,
    commitComposingNumber,
    clearComposing,
  } = useMarkingStore();
  const { saveScore } = useScoreSave();
  const { showToast } = useToastStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const question = questions[activeQuestionIndex];
      if (!question) return;

      const { max_marks, question_number } = question;

      switch (e.key) {
        // ── Question navigation (no save) ────────────────────────────────────
        case 'ArrowLeft':
          e.preventDefault();
          clearComposing();
          setActiveQuestion(Math.max(0, activeQuestionIndex - 1));
          break;

        case 'ArrowRight':
          e.preventDefault();
          clearComposing();
          setActiveQuestion(Math.min(questions.length - 1, activeQuestionIndex + 1));
          break;

        // ── Quick-mark shortcuts ──────────────────────────────────────────────
        case 'f':
        case 'F':
          e.preventDefault();
          clearComposing();
          setScore(question_number, max_marks);
          saveScore(question_number, max_marks, max_marks);
          break;

        case 'h':
        case 'H': {
          e.preventDefault();
          clearComposing();
          const half = roundToHalf(max_marks / 2);
          setScore(question_number, half);
          saveScore(question_number, half, max_marks);
          break;
        }

        case 'Backspace':
          e.preventDefault();
          clearComposing();
          setScore(question_number, null);
          break;

        // ── Tab: save + move to prev/next question ───────────────────────────
        case 'Tab': {
          e.preventDefault();
          const committed = commitComposingNumber();
          if (committed) {
            const num = parseFloat(committed);
            if (!isNaN(num)) {
              if (num > max_marks) {
                showToast(`${num} exceeds the maximum of ${max_marks} marks for this question.`, 'warning');
              } else {
                setScore(question_number, num);
                saveScore(question_number, num, max_marks);
              }
            }
          }
          setActiveQuestion(
            e.shiftKey
              ? Math.max(0, activeQuestionIndex - 1)
              : Math.min(questions.length - 1, activeQuestionIndex + 1),
          );
          break;
        }

        // ── Enter: save current score, then next/prev student ────────────────
        case 'Enter': {
          e.preventDefault();
          const raw = commitComposingNumber();
          const num = parseFloat(raw || '');
          if (!isNaN(num)) {
            if (num > max_marks) {
              showToast(`${num} exceeds the maximum of ${max_marks} marks for this question.`, 'warning');
              break;
            }
            setScore(question_number, num);
            saveScore(question_number, num, max_marks);
          }
          const currentIdx = submissions.findIndex(s => s.id === activeSubmissionId);
          if (e.shiftKey) {
            if (currentIdx > 0) onSelectStudent(submissions[currentIdx - 1].id);
          } else {
            if (currentIdx >= 0 && currentIdx < submissions.length - 1) {
              onSelectStudent(submissions[currentIdx + 1].id);
            }
          }
          break;
        }

        // ── Digit entry ───────────────────────────────────────────────────────
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
  }, [activeQuestionIndex, activeSubmissionId, questions, submissions]);
}
