import api from './axios';
import type { Submission, SubmissionQuestion } from '../types';

export const submissionsApi = {
  listForSession: (sessionId: string) =>
    api.get<Submission[]>(`/sessions/${sessionId}/submissions`).then(r => r.data),

  get: (id: string) => api.get<Submission>(`/submissions/${id}`).then(r => r.data),

  getQuestions: (id: string) =>
    api.get<SubmissionQuestion[]>(`/submissions/${id}/questions`).then(r => r.data),
};
