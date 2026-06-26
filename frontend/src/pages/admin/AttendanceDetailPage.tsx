import { useEffect, useState, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import TopBar from '../../components/layout/TopBar';
import Spinner from '../../components/ui/Spinner';
import { sessionsApi } from '../../api/sessions';
import { auditApi } from '../../api/audit';
import type { AttendanceRecord, AuditSession } from '../../types';

export default function AttendanceDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();

  const [sessionInfo, setSessionInfo] = useState<AuditSession | null>(
    (location.state as { session?: AuditSession } | null)?.session ?? null
  );
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetches: Promise<unknown>[] = [
      sessionsApi.getAttendance(sessionId).then(setRecords),
    ];

    if (!sessionInfo) {
      fetches.push(
        auditApi.getSessions().then(sessions => {
          const found = sessions.find(s => s.session_id === sessionId);
          if (found) setSessionInfo(found);
        })
      );
    }

    Promise.all(fetches)
      .catch(() => setError('Failed to load attendance data.'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const filtered = useMemo(
    () =>
      search.trim()
        ? records.filter(r =>
            r.student_id.toLowerCase().includes(search.trim().toLowerCase())
          )
        : records,
    [records, search]
  );

  function exportToExcel() {
    const label = sessionInfo
      ? `${sessionInfo.class_name}_${sessionInfo.course_name}`
      : sessionId ?? 'session';
    const data = filtered.map((r, i) => ({
      '#': i + 1,
      'Student Index Number': r.student_id,
      'Date Scanned': r.scan_date,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    // Column widths
    ws['!cols'] = [{ wch: 5 }, { wch: 24 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${label.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sessionDate = sessionInfo
    ? new Date(sessionInfo.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div>
      <TopBar
        title="Attendance"
        backTo="/admin/attendance"
        actions={
          !loading && !error && records.length > 0 ? (
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <ExportIcon />
              Export to Excel
            </button>
          ) : undefined
        }
      />

      <div className="p-6 space-y-6">
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

        {!loading && !error && (
          <>
            {/* Header card */}
            {sessionInfo && (
              <div className="rounded-2xl bg-gradient-to-br from-primary to-blue-500 text-white p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-blue-100 text-xs font-medium uppercase tracking-wider mb-1">
                      Session
                    </p>
                    <h2 className="text-2xl font-bold">{sessionInfo.class_name}</h2>
                    <p className="text-blue-100 mt-1">{sessionInfo.course_name}</p>
                  </div>
                  <div className="flex flex-col sm:items-end gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-sm font-semibold">
                      <PeopleIcon />
                      {records.length} student{records.length !== 1 ? 's' : ''} attended
                    </span>
                    <span className="text-blue-100 text-sm">{sessionDate}</span>
                    <span className="text-blue-100 text-xs">
                      Operator: {sessionInfo.operator_name}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Search bar */}
            <div className="relative max-w-sm">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Search by index number…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <ClearIcon />
                </button>
              )}
            </div>

            {/* Results count when searching */}
            {search && (
              <p className="text-xs text-gray-500 -mt-2">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
              </p>
            )}

            {/* Table */}
            {records.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <PeopleIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No attendance records for this session.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-400 text-sm">No students match &ldquo;{search}&rdquo;.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">
                        #
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Student Index Number
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Date Scanned
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((record, index) => (
                      <tr
                        key={record.student_id}
                        className={`hover:bg-blue-50/40 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">
                          {index + 1}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono font-semibold text-gray-900 tracking-wide">
                            {record.student_id}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">
                          {new Date(record.scan_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
                  {filtered.length} of {records.length} student{records.length !== 1 ? 's' : ''}
                  {search ? ' (filtered)' : ''}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ExportIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PeopleIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'h-4 w-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
