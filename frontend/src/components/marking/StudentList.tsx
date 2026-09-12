import { useMemo, useState } from 'react';
import type { Submission } from '../../types';
import Badge from '../ui/Badge';
import { formatMarks } from '../../utils/markingHelpers';

interface StudentListProps {
  submissions: Submission[];
  activeId: string | null;
  totalQuestions: number;
  onSelect: (id: string) => void;
}

type SortOption = 'default' | 'index-asc' | 'index-desc' | 'booklet-asc' | 'booklet-desc';

// A submission's "booklet number" is the scan order of its first sheet —
// the sequential position the physical script was scanned in on the belt.
function getBookletNumber(sub: Submission): number | null {
  return sub.sheets && sub.sheets.length > 0 ? sub.sheets[0].upload_order : null;
}

export default function StudentList({
  submissions,
  activeId,
  totalQuestions,
  onSelect,
}: StudentListProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('default');

  const visibleSubmissions = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = submissions;

    if (query) {
      list = list.filter((sub) => {
        const booklet = getBookletNumber(sub);
        return (
          sub.student_id.toLowerCase().includes(query) ||
          (booklet !== null && String(booklet).includes(query))
        );
      });
    }

    if (sortBy !== 'default') {
      list = [...list].sort((a, b) => {
        switch (sortBy) {
          case 'index-asc':
            return a.student_id.localeCompare(b.student_id);
          case 'index-desc':
            return b.student_id.localeCompare(a.student_id);
          case 'booklet-asc':
            return (getBookletNumber(a) ?? Infinity) - (getBookletNumber(b) ?? Infinity);
          case 'booklet-desc':
            return (getBookletNumber(b) ?? -Infinity) - (getBookletNumber(a) ?? -Infinity);
        }
      });
    }

    return list;
  }, [submissions, search, sortBy]);

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white border-r border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Students</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400 p-4 text-center">
          No submissions yet.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0 space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">
          Students ({submissions.length})
        </h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search index or booklet number"
          className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="default">Sort: default order</option>
          <option value="index-asc">Index number (A–Z)</option>
          <option value="index-desc">Index number (Z–A)</option>
          <option value="booklet-asc">Booklet number (low–high)</option>
          <option value="booklet-desc">Booklet number (high–low)</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {visibleSubmissions.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-400">
            No students match "{search}".
          </div>
        ) : (
          visibleSubmissions.map((sub) => {
            const isActive = sub.id === activeId;
            const scoredCount = sub.scores?.filter((s) => s.awarded_marks !== null).length ?? 0;
            const progress = totalQuestions > 0 ? (scoredCount / totalQuestions) * 100 : 0;
            const bookletNumber = getBookletNumber(sub);

            return (
              <button
                key={sub.id}
                onClick={() => onSelect(sub.id)}
                className={`
                  w-full text-left px-4 py-3 border-b border-gray-100 transition-colors
                  focus:outline-none focus:ring-inset focus:ring-2 focus:ring-primary
                  ${isActive ? 'bg-primary text-white' : 'hover:bg-gray-50 text-gray-700'}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-mono font-medium ${isActive ? 'text-white' : 'text-gray-900'}`}>
                    {sub.student_id}
                  </span>
                  <Badge
                    variant={sub.status}
                    className={isActive ? 'opacity-90' : ''}
                  />
                </div>

                {bookletNumber !== null && (
                  <div className={`text-xs mb-1 ${isActive ? 'text-primary-mid' : 'text-gray-400'}`}>
                    Booklet #{bookletNumber}
                  </div>
                )}

                {/* Score */}
                <div className={`text-xs mb-1.5 ${isActive ? 'text-primary-mid' : 'text-gray-500'}`}>
                  {sub.total_score !== null ? formatMarks(sub.total_score) : '—'}
                  {totalQuestions > 0 && ` · ${scoredCount}/${totalQuestions} questions`}
                </div>

                {/* Progress bar */}
                {totalQuestions > 0 && (
                  <div className={`h-1 rounded-full ${isActive ? 'bg-white/30' : 'bg-gray-200'}`}>
                    <div
                      className={`h-1 rounded-full transition-all ${isActive ? 'bg-white' : 'bg-primary'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
