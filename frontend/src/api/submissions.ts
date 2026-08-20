import api from './axios';
import type { AiSuggestion, Submission, SubmissionQuestion } from '../types';

export const submissionsApi = {
  listForSession: (sessionId: string) =>
    api.get<Submission[]>(`/sessions/${sessionId}/submissions`).then(r => r.data),

  get: (id: string) => api.get<Submission>(`/submissions/${id}`).then(r => r.data),

  getQuestions: (id: string) =>
    api.get<SubmissionQuestion[]>(`/submissions/${id}/questions`).then(r => r.data),

  getAiSuggestion: (submissionId: string, question: SubmissionQuestion) =>
    api
      .post<AiSuggestion>(
        `/submissions/${submissionId}/questions/${question.question_number}/ai-suggestion`,
        {
          question_text: question.question_text ?? '',
          student_answer: question.text_content,
          expected_answer: question.expected_answer,
          max_marks: question.max_marks,
        }
      )
      .then(r => r.data),
};
