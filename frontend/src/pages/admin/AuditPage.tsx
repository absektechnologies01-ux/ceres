import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/layout/TopBar';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { auditApi } from '../../api/audit';
import type { AuditSession, ReviewStatus } from '../../types';

function ReviewBadge({ status }: { status: ReviewStatus }) {
  if (status === 'approved') return <Badge variant="success" label="Approved" />;
  if (status === 'rejected') return <Badge variant="danger" label="Rejected" />;
  return <Badge variant="default" label="Pending Review" />;
}

export default function AuditPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    auditApi.getSessions()
      .then(setSessions)
      .catch(() => setError('Failed to load audit sessions.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <TopBar title="Marking Audit" />
      <div className="p-6">
        {loading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}
        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}
        {!loading && !error && sessions.length === 0 && (
          <p className="text-gray-500 text-sm">No sessions found.</p>
        )}
        {!loading && !error && sessions.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Class / Course</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Teacher</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Operator</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Progress</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Review</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map(s => (
                  <tr key={s.session_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.class_name}</p>
                      <p className="text-gray-500 text-xs">{s.course_name}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{s.teacher_name ?? <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3 text-gray-700">{s.operator_name}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-gray-900">{s.marked_count} / {s.total_submissions}</span>
                      <span className="text-gray-400 text-xs ml-1">marked</span>
                    </td>
                    <td className="px-4 py-3">
                      <ReviewBadge status={s.review_status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/admin/audit/${s.session_id}`)}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        Review →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
