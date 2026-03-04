import api from './axios';
import type { MarkingScheme } from '../types';

export const schemesApi = {
  upload: (sessionId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<MarkingScheme>(`/sessions/${sessionId}/scheme`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  get: (sessionId: string) =>
    api.get<MarkingScheme>(`/sessions/${sessionId}/scheme`).then(r => r.data),
};
