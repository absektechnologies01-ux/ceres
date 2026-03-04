import { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import type { TeacherAssignment, User, Class, Course } from '../../types';
import TopBar from '../../components/layout/TopBar';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ teacher_id: '', class_id: '', course_id: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [a, u, cl, co] = await Promise.all([
        adminApi.getAssignments(),
        adminApi.getUsers(),
        adminApi.getClasses(),
        adminApi.getCourses(),
      ]);
      setAssignments(a);
      setTeachers(u.filter((u) => u.role === 'teacher'));
      setClasses(cl);
      setCourses(co);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this assignment?')) return;
    try {
      await adminApi.deleteAssignment(id);
      load();
    } catch { alert('Failed to delete.'); }
  };

  const handleSubmit = async () => {
    if (!form.teacher_id || !form.class_id || !form.course_id) {
      alert('Please fill in all fields.');
      return;
    }
    setSaving(true);
    try {
      await adminApi.createAssignment(form);
      setModalOpen(false);
      load();
    } catch { alert('Failed to create assignment.'); }
    finally { setSaving(false); }
  };

  const getName = (list: { id: string; name: string }[], id: string) =>
    list.find((x) => x.id === id)?.name ?? id;

  const columns = [
    { key: 'teacher', header: 'Teacher', render: (a: TeacherAssignment) => getName(teachers, a.teacher_id) },
    { key: 'class', header: 'Class', render: (a: TeacherAssignment) => getName(classes, a.class_id) },
    { key: 'course', header: 'Course', render: (a: TeacherAssignment) => getName(courses, a.course_id) },
    {
      key: 'actions',
      header: 'Actions',
      render: (a: TeacherAssignment) => (
        <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)}>Remove</Button>
      ),
    },
  ];

  const sel = (key: keyof typeof form, label: string, options: { value: string; label: string }[]) => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">Select…</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div>
      <TopBar
        title="Teacher Assignments"
        backTo="/admin"
        actions={<Button onClick={() => { setForm({ teacher_id: '', class_id: '', course_id: '' }); setModalOpen(true); }}>Assign Teacher</Button>}
      />
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <Table columns={columns} data={assignments} keyExtractor={(a) => a.id} emptyMessage="No assignments yet." />
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Assign Teacher">
        <div className="space-y-4">
          {sel('teacher_id', 'Teacher', teachers.map((t) => ({ value: t.id, label: t.name })))}
          {sel('class_id', 'Class', classes.map((c) => ({ value: c.id, label: c.name })))}
          {sel('course_id', 'Course', courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })))}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSubmit}>Create Assignment</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
