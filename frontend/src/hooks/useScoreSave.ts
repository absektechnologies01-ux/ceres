import { useMarkingStore } from '../store/markingStore';
import api from '../api/axios';

export function useScoreSave() {
  const { activeSubmissionId, markSaving, markSaved, markError } = useMarkingStore();

  const saveScore = async (
    question_number: string,
    awarded_marks: number,
    max_marks: number
  ) => {
    if (!activeSubmissionId) return;
    markSaving(question_number);
    try {
      await api.put(`/submissions/${activeSubmissionId}/scores`, [
        { question_number, awarded_marks, max_marks },
      ]);
      markSaved(question_number);
    } catch {
      markError(question_number);
    }
  };

  return { saveScore };
}
