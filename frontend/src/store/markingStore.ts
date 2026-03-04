import { create } from 'zustand';

interface ScoreEntry {
  question_number: string;
  awarded_marks: number | null;
  max_marks: number;
  comment: string | null;
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
  scores: Record<string, ScoreEntry>;
  composingNumber: string;

  setActiveSubmission: (id: string) => void;
  setActiveQuestion: (index: number) => void;
  toggleOriginalImage: () => void;
  initScores: (questions: {
    question_number: string;
    max_marks: number;
    awarded_marks: number | null;
    comment: string | null;
  }[]) => void;
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
  composingNumber: '',

  setActiveSubmission: (id) =>
    set({ activeSubmissionId: id, activeQuestionIndex: 0, showOriginalImage: false }),

  setActiveQuestion: (index) =>
    set({ activeQuestionIndex: index, composingNumber: '' }),

  toggleOriginalImage: () =>
    set((s) => ({ showOriginalImage: !s.showOriginalImage })),

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

  setScore: (qn, marks) =>
    set((s) => ({
      scores: {
        ...s.scores,
        [qn]: { ...s.scores[qn], awarded_marks: marks, saved: false },
      },
    })),

  setComment: (qn, comment) =>
    set((s) => ({
      scores: {
        ...s.scores,
        [qn]: { ...s.scores[qn], comment, commentSaved: false },
      },
    })),

  markSaving: (qn) =>
    set((s) => ({
      scores: { ...s.scores, [qn]: { ...s.scores[qn], saving: true, error: false } },
    })),

  markSaved: (qn) =>
    set((s) => ({
      scores: { ...s.scores, [qn]: { ...s.scores[qn], saving: false, saved: true } },
    })),

  markError: (qn) =>
    set((s) => ({
      scores: { ...s.scores, [qn]: { ...s.scores[qn], saving: false, error: true } },
    })),

  markCommentSaving: (qn) =>
    set((s) => ({
      scores: { ...s.scores, [qn]: { ...s.scores[qn], commentSaving: true } },
    })),

  markCommentSaved: (qn) =>
    set((s) => ({
      scores: {
        ...s.scores,
        [qn]: { ...s.scores[qn], commentSaving: false, commentSaved: true },
      },
    })),

  appendComposingDigit: (digit) => {
    set((s) => ({ composingNumber: s.composingNumber + digit }));
  },

  commitComposingNumber: () => {
    const { composingNumber } = get();
    set({ composingNumber: '' });
    return composingNumber || null;
  },

  clearComposing: () => {
    set({ composingNumber: '' });
  },
}));
