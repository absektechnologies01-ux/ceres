import api from './axios';
import type {
  AuditSession,
  AuditSessionDetail,
  MarkingReview,
  AnalyticsOverview,
  SessionAnalytics,
} from '../types';

export const auditApi = {
  getSessions: (): Promise<AuditSession[]> =>
    api.get('/admin/audit').then(r => r.data),

  getSession: (sessionId: string): Promise<AuditSessionDetail> =>
    api.get(`/admin/audit/${sessionId}`).then(r => r.data),

  approveSession: (sessionId: string): Promise<MarkingReview> =>
    api.post(`/admin/audit/${sessionId}/approve`).then(r => r.data),

  rejectSession: (sessionId: string, note: string): Promise<MarkingReview> =>
    api.post(`/admin/audit/${sessionId}/reject`, { note }).then(r => r.data),

  getOverviewStats: (): Promise<AnalyticsOverview> =>
    api.get('/admin/analytics').then(r => r.data),

  getSessionAnalytics: (sessionId: string): Promise<SessionAnalytics> =>
    api.get(`/sessions/${sessionId}/analytics`).then(r => r.data),
};
