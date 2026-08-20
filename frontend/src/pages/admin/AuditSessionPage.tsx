import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import TopBar from '../../components/layout/TopBar';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { auditApi } from '../../api/audit';
import { useToastStore } from '../../store/toastStore';
import { formatMarks } from '../../utils/markingHelpers';
import type { AuditSessionDetail, AuditSubmission, ReviewStatus } from '../../types';

function ReviewBadge({ status }: { status: ReviewStatus }) {
  if (status === 'approved') return <Badge variant="success" label="Approved" />;
  if (status === 'rejected') return <Badge variant="danger" label="Rejected" />;
  return <Badge variant="default" label="Pending Review" />;
}

function exportResultsCSV(detail: AuditSessionDetail) {
  const header = ['Student ID', 'Total Score', 'Max Score', 'Percentage', 'Status'];
  const schemeMax = detail.scheme_questions.reduce((s, q) => s + (q.max_marks ?? 0), 0);
  const rows = detail.submissions.map(sub => {
    const total = sub.total_score ?? '';
    const pct = sub.total_score != null && schemeMax > 0
      ? ((sub.total_score / schemeMax) * 100).toFixed(1) + '%'
      : '';
    return [sub.student_id, total, schemeMax, pct, sub.status];
  });
  const csv = [header, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${detail.class_name}_${detail.course_name}_audit.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { showToast } = useToastStore();

  const [detail, setDetail] = useState<AuditSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [selectedSub, setSelectedSub] = useState<AuditSubmission | null>(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    auditApi.getSession(sessionId)
      .then(data => {
        setDetail(data);
        if (data.submissions.length > 0) setSelectedSub(data.submissions[0]);
      })
      .catch(() => showToast('Failed to load session.', 'error'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  async function handleApprove() {
    if (!sessionId || !detail) return;
    setActing(true);
    try {
      const review = await auditApi.approveSession(sessionId);
      setDetail(d => d ? { ...d, review_status: review.status, review_note: null } : d);
      showToast('Marking approved.', 'success');
    } catch {
      showToast('Failed to approve.', 'error');
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!sessionId || !rejectNote.trim()) return;
    setActing(true);
    try {
      const review = await auditApi.rejectSession(sessionId, rejectNote.trim());
      setDetail(d => d ? { ...d, review_status: review.status, review_note: review.note } : d);
      setRejectModal(false);
      setRejectNote('');
      showToast('Marking sent back to teacher.', 'success');
    } catch {
      showToast('Failed to reject.', 'error');
    } finally {
      setActing(false);
    }
  }

  if (loading) return (
    <div>
      <TopBar title="Audit Session" backTo="/admin/audit" />
      <div className="flex justify-center py-16"><Spinner /></div>
    </div>
  );

  if (!detail) return (
    <div>
      <TopBar title="Audit Session" backTo="/admin/audit" />
      <p className="p-6 text-red-600">Session not found.</p>
    </div>
  );

  const schemeMax = detail.scheme_questions.reduce((s, q) => s + (q.max_marks ?? 0), 0);

  return (
    <div className="flex flex-col h-screen">
      <TopBar title={`${detail.class_name} — ${detail.course_name}`} backTo="/admin/audit" />

      {/* Review status banner */}
      {detail.review_status === 'approved' && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 flex items-center gap-2 text-green-800 text-sm">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Marking approved — results are locked.
        </div>
      )}
      {detail.review_status === 'rejected' && detail.review_note && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-red-800 text-sm">
          <span className="font-medium">Rejected:</span> {detail.review_note}
        </div>
      )}

      {/* Action bar */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <ReviewBadge status={detail.review_status} />
          <span className="text-sm text-gray-500">
            {detail.submissions.filter(s => s.status === 'marked').length} / {detail.submissions.length} marked
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportResultsCSV(detail)}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </button>
          {detail.review_status !== 'approved' && (
            <>
              <button
                onClick={() => setRejectModal(true)}
                disabled={acting}
                className="text-sm px-3 py-1.5 border border-red-300 rounded-md text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={acting}
                className="text-sm px-4 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {acting ? 'Saving…' : 'Approve'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: student list */}
        <div className="w-56 border-r border-gray-200 overflow-y-auto bg-white flex-shrink-0">
          {detail.submissions.map(sub => {
            const isActive = selectedSub?.submission_id === sub.submission_id;
            const pct = sub.total_score != null && schemeMax > 0
              ? Math.round((sub.total_score / schemeMax) * 100)
              : null;
            return (
              <div
                key={sub.submission_id}
                onClick={() => setSelectedSub(sub)}
                className={`px-4 py-3 border-b border-gray-100 cursor-pointer ${isActive ? 'bg-primary-light border-l-4 border-l-primary' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
              >
                <p className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-gray-900'}`}>{sub.student_id}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${sub.status === 'marked' ? 'bg-green-100 text-green-700' : sub.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {sub.status}
                  </span>
                  {pct !== null && <span className="text-xs text-gray-500 font-mono">{pct}%</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: score detail */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedSub ? (
            <p className="text-gray-400 text-sm">Select a student to view marking.</p>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{selectedSub.student_id}</h2>
                <span className="text-2xl font-bold text-gray-900 font-mono">
                  {formatMarks(selectedSub.total_score)}
                  <span className="text-base font-normal text-gray-400"> / {formatMarks(schemeMax)}</span>
                </span>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Question</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Score</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Comment</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Marked by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedSub.scores.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-400">No scores recorded yet.</td>
                      </tr>
                    ) : (
                      selectedSub.scores.map(sc => (
                        <tr key={sc.question_number}>
                          <td className="px-4 py-3 font-mono text-gray-800">{sc.question_number}</td>
                          <td className="px-4 py-3 font-mono">
                            <span className={sc.awarded_marks !== null ? 'text-gray-900' : 'text-gray-300'}>
                              {sc.awarded_marks !== null ? formatMarks(sc.awarded_marks) : '—'}
                            </span>
                            <span className="text-gray-400"> / {formatMarks(sc.max_marks)}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{sc.comment ?? <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3 text-gray-500">{sc.teacher_name}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reject modal */}
      <Modal open={rejectModal} title="Reject Marking" onClose={() => setRejectModal(false)}>
        <p className="text-sm text-gray-600 mb-3">Provide a reason so the teacher knows what to revise.</p>
        <textarea
          value={rejectNote}
          onChange={e => setRejectNote(e.target.value)}
          rows={4}
          placeholder="e.g. Question 3b scores appear too generous — please review."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setRejectModal(false)} className="text-sm px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={!rejectNote.trim() || acting}
            className="text-sm px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {acting ? 'Sending…' : 'Send Back'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
