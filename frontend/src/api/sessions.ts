import api from './axios';
import type { ScanSession, Sheet, AttendanceRecord } from '../types';

export const sessionsApi = {
  create: (body: { class_id: string; course_id: string }) =>
    api.post<ScanSession>('/sessions', body).then(r => r.data),

  list: () => api.get<ScanSession[]>('/sessions').then(r => r.data),

  listAll: () => api.get<ScanSession[]>('/sessions/all').then(r => r.data),

  get: (id: string) => api.get<ScanSession>(`/sessions/${id}`).then(r => r.data),

  close: (id: string) => api.put<ScanSession>(`/sessions/${id}/close`).then(r => r.data),

  uploadSheet: (
    id: string,
    body: FormData
  ) => api.post<Sheet>(`/sessions/${id}/sheets`, body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data),

  getSheets: (id: string) => api.get<Sheet[]>(`/sessions/${id}/sheets`).then(r => r.data),

  getFlaggedSheets: (id: string) =>
    api.get<Sheet[]>(`/sessions/${id}/sheets/flagged`).then(r => r.data),

  resolveSheet: (sessionId: string, sheetId: string, studentIdConfirmed: string) =>
    api.put<Sheet>(`/sessions/${sessionId}/sheets/${sheetId}/resolve`, {
      student_id_confirmed: studentIdConfirmed,
    }).then(r => r.data),

  delete: (id: string) => api.delete(`/sessions/${id}`),

  getAttendance: (id: string) =>
    api.get<AttendanceRecord[]>(`/sessions/${id}/attendance`).then(r => r.data),
};
