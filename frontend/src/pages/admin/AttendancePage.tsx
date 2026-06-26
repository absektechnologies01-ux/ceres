import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/layout/TopBar';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { auditApi } from '../../api/audit';
import type { AuditSession } from '../../types';

export default function AttendancePage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    auditApi.getSessions()
      .then(setSessions)
      .catch(() => setError('Failed to load sessions.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <TopBar title="Attendance Records" />
      <div className="p-6">
        {loading && (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {!loading && !error && sessions.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">No sessions found.</p>
          </div>
        )}
        {!loading && !error && sessions.length > 0 && (
          <>
            <p className="text-sm text-gray-500 mb-5">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} total
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {sessions.map(s => (
                <SessionCard
                  key={s.session_id}
                  session={s}
                  onView={() =>
                    navigate(`/admin/attendance/${s.session_id}`, { state: { session: s } })
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SessionCard({
  session,
  onView,
}: {
  session: AuditSession;
  onView: () => void;
}) {
  const date = new Date(session.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col">
      {/* Card header accent */}
      <div className="h-1.5 rounded-t-xl bg-gradient-to-r from-primary to-blue-400" />

      <div className="p-5 flex flex-col flex-1">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{session.class_name}</p>
            <p className="text-sm text-gray-500 truncate mt-0.5">{session.course_name}</p>
          </div>
          {session.session_status === 'active' ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="default">Closed</Badge>
          )}
        </div>

        {/* Meta rows */}
        <div className="space-y-2 text-sm flex-1">
          <MetaRow
            icon={<UserIcon />}
            label="Operator"
            value={session.operator_name}
          />
          <MetaRow
            icon={<CalendarIcon />}
            label="Date"
            value={date}
          />
          <MetaRow
            icon={<DocumentIcon />}
            label="Students"
            value={`${session.total_submissions} scanned`}
          />
        </div>

        <button
          onClick={onView}
          className="mt-4 w-full py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          View Attendance
        </button>
      </div>
    </div>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <span className="text-gray-400 shrink-0">{label}:</span>
      <span className="text-gray-700 font-medium truncate">{value}</span>
    </div>
  );
}

function UserIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
