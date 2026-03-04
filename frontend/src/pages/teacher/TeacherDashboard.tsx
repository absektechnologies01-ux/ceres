import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sessionsApi } from '../../api/sessions';
import { adminApi } from '../../api/admin';
import type { ScanSession, Class, Course } from '../../types';
import TopBar from '../../components/layout/TopBar';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';

export default function TeacherDashboard() {
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (s: ScanSession) => {
    const label = `${getName(classes, s.class_id)} · ${getName(courses, s.course_id)}`;
    if (!window.confirm(`Delete session "${label}"?\n\nThis will permanently remove all sheets, submissions and scores. This cannot be undone.`)) return;
    setDeletingId(s.id);
    try {
      await sessionsApi.delete(s.id);
      setSessions(prev => prev.filter(x => x.id !== s.id));
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    Promise.allSettled([sessionsApi.listAll(), adminApi.getClasses(), adminApi.getCourses()])
      .then(([s, cl, co]) => {
        if (s.status === 'fulfilled') setSessions(s.value);
        if (cl.status === 'fulfilled') setClasses(cl.value);
        if (co.status === 'fulfilled') setCourses(co.value);
      })
      .finally(() => setLoading(false));
  }, []);

  const getName = (list: { id: string; name: string }[], id: string) =>
    list.find(x => x.id === id)?.name ?? id;

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div>
      <TopBar title="My Sessions" />
      <div className="p-6">
        {sessions.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg font-medium">No sessions assigned to you</p>
            <p className="text-sm mt-1">Sessions appear here once a scan operator creates them for your class/course.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="bg-white rounded-lg border border-gray-200 px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{getName(classes, s.class_id)}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-600 text-sm">{getName(courses, s.course_id)}</span>
                    <Badge variant={s.status === 'active' ? 'active' : 'closed'} />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-gray-400">
                      Created {new Date(s.created_at).toLocaleDateString()} at {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.submission_count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {s.submission_count} submission{s.submission_count !== 1 ? 's' : ''}
                    </span>
                    {s.has_scheme && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Scheme uploaded
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDelete(s)}
                    disabled={deletingId === s.id}
                    className="text-red-500 hover:text-red-700 border-red-200 hover:border-red-400"
                  >
                    {deletingId === s.id ? '…' : 'Delete'}
                  </Button>
                  <Link to={`/teacher/sessions/${s.id}/scheme`}>
                    <Button size="sm" variant="secondary">Manage Scheme</Button>
                  </Link>
                  <Link to={`/teacher/sessions/${s.id}/marking`}>
                    <Button size="sm" variant="primary">Mark</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
