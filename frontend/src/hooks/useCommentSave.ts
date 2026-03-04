import { useRef } from 'react';
import { useMarkingStore } from '../store/markingStore';
import api from '../api/axios';

export function useCommentSave() {
  const { activeSubmissionId, setComment, markCommentSaving, markCommentSaved } =
    useMarkingStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveComment = (question_number: string, comment: string | null) => {
    // Update local state immediately
    setComment(question_number, comment);

    // Debounce the API call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!activeSubmissionId) return;
      markCommentSaving(question_number);
      try {
        await api.put(
          `/submissions/${activeSubmissionId}/scores/${question_number}/comment`,
          { comment }
        );
        markCommentSaved(question_number);
      } catch {
        // Non-critical — keep optimistic local state
        console.error('Failed to save comment for', question_number);
        markCommentSaved(question_number);
      }
    }, 1000);
  };

  /**
   * Flush the pending debounce immediately (call on question change)
   */
  const flushComment = (question_number: string, comment: string | null) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      if (!activeSubmissionId || comment === null) return;
      markCommentSaving(question_number);
      api
        .put(
          `/submissions/${activeSubmissionId}/scores/${question_number}/comment`,
          { comment }
        )
        .then(() => markCommentSaved(question_number))
        .catch(() => markCommentSaved(question_number));
    }
  };

  return { saveComment, flushComment };
}
