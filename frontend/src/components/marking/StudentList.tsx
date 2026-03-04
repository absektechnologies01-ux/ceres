import type { Submission } from '../../types';
import Badge from '../ui/Badge';
import { formatMarks } from '../../utils/markingHelpers';

interface StudentListProps {
  submissions: Submission[];
  activeId: string | null;
  totalQuestions: number;
  onSelect: (id: string) => void;
}

export default function StudentList({
  submissions,
  activeId,
  totalQuestions,
  onSelect,
}: StudentListProps) {
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
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-700">
          Students ({submissions.length})
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {submissions.map((sub) => {
          const isActive = sub.id === activeId;
          const scoredCount = sub.scores?.filter((s) => s.awarded_marks !== null).length ?? 0;
          const progress = totalQuestions > 0 ? (scoredCount / totalQuestions) * 100 : 0;

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
        })}
      </div>
    </div>
  );
}
