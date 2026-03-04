import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { markingApi } from '../../api/marking';
import { sessionsApi } from '../../api/sessions';
import type { SessionResult, Sheet } from '../../types';
import TopBar from '../../components/layout/TopBar';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import { formatMarks } from '../../utils/markingHelpers';

export default function SessionOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const [results, setResults] = useState<SessionResult[]>([]);
  const [flagged, setFlagged] = useState<Sheet[]>([]);
  const [resolveInputs, setResolveInputs] = useState<Record<string, string>>({});
  const [resolving, setResolving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    if (!id) return;
    Promise.allSettled([
      markingApi.getResults(id),
      sessionsApi.getFlaggedSheets(id),
    ]).then(([resultsRes, flaggedRes]) => {
      if (resultsRes.status === 'fulfilled') setResults(resultsRes.value);
      if (flaggedRes.status === 'fulfilled') {
        const sheets = flaggedRes.value;
        setFlagged(sheets);
        // Pre-fill inputs with whatever the OCR detected
        const inputs: Record<string, string> = {};
        sheets.forEach(s => { inputs[s.id] = s.student_id_raw ?? ''; });
        setResolveInputs(inputs);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(fetchData, [id]);

  const handleResolve = async (sheetId: string) => {
    const studentId = resolveInputs[sheetId]?.trim();
    if (!studentId || !id) return;
    setResolving(r => ({ ...r, [sheetId]: true }));
    try {
      await sessionsApi.resolveSheet(id, sheetId, studentId);
      // Refresh both lists after resolution
      fetchData();
    } finally {
      setResolving(r => ({ ...r, [sheetId]: false }));
    }
  };

  const columns = [
    { key: 'student_id', header: 'Student ID' },
    {
      key: 'status',
      header: 'Status',
      render: (r: SessionResult) => <Badge variant={r.status} />,
    },
    {
      key: 'score',
      header: 'Score',
      render: (r: SessionResult) => (
        <span className="font-mono text-sm">
          {r.total_score !== null ? formatMarks(r.total_score) : '—'} / {formatMarks(r.max_possible)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_r: SessionResult) => (
        <Link to={`/teacher/sessions/${id}/marking`}>
          <Button size="sm" variant="secondary">Mark</Button>
        </Link>
      ),
    },
  ];

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const totalMarked = results.filter(r => r.status === 'marked').length;

  return (
    <div>
      <TopBar
        title="Session Overview"
        backTo="/teacher"
        actions={
          <div className="flex gap-2">
            <Link to={`/teacher/sessions/${id}/scheme`}>
              <Button variant="secondary" size="sm">Manage Scheme</Button>
            </Link>
            <Link to={`/teacher/sessions/${id}/marking`}>
              <Button variant="primary" size="sm">Go to Marking</Button>
            </Link>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Students', value: results.length },
            { label: 'Marked', value: totalMarked },
            { label: 'Remaining', value: results.length - totalMarked },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Flagged sheets panel */}
        {flagged.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-amber-700 mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                {flagged.length}
              </span>
              Flagged Sheets — Student ID Unclear
            </h2>
            <div className="space-y-3">
              {flagged.map(sheet => (
                <div
                  key={sheet.id}
                  className="flex gap-4 bg-amber-50 border border-amber-200 rounded-lg p-4"
                >
                  {/* Thumbnail */}
                  <a href={sheet.image_url} target="_blank" rel="noreferrer" className="flex-shrink-0">
                    <img
                      src={sheet.image_url}
                      alt="Scanned sheet"
                      className="w-20 h-28 object-cover rounded border border-amber-200 hover:opacity-80 transition-opacity"
                    />
                  </a>

                  {/* Info + resolve form */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-amber-600 mb-1">
                      Sheet #{sheet.upload_order}
                      {sheet.student_id_raw && (
                        <> · Detected: <span className="font-mono font-semibold">{sheet.student_id_raw}</span></>
                      )}
                      {sheet.id_confidence !== null && (
                        <> · Confidence: {Math.round(sheet.id_confidence * 100)}%</>
                      )}
                      {!sheet.student_id_raw && ' · No ID detected'}
                    </p>
                    <div className="flex gap-2 items-center mt-2">
                      <input
                        type="text"
                        value={resolveInputs[sheet.id] ?? ''}
                        onChange={e =>
                          setResolveInputs(r => ({ ...r, [sheet.id]: e.target.value }))
                        }
                        placeholder="Enter correct student ID"
                        className="flex-1 text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                      />
                      <button
                        onClick={() => handleResolve(sheet.id)}
                        disabled={!resolveInputs[sheet.id]?.trim() || resolving[sheet.id]}
                        className="px-3 py-1.5 text-sm font-medium bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                      >
                        {resolving[sheet.id] ? 'Saving…' : 'Confirm ID'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results table */}
        <div>
          {flagged.length === 0 && results.length === 0 && (
            <p className="text-sm text-gray-500">No submissions yet.</p>
          )}
          {results.length > 0 && (
            <Table
              columns={columns}
              data={results}
              keyExtractor={(r) => r.student_id}
              emptyMessage="No submissions yet."
            />
          )}
        </div>
      </div>
    </div>
  );
}
