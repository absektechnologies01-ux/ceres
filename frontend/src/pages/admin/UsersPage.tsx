import { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import type { User } from '../../types';
import TopBar from '../../components/layout/TopBar';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';

interface UserForm {
  name: string;
  email: string;
  role: string;
  password: string;
}

const emptyForm: UserForm = { name: '', email: '', role: 'teacher', password: '' };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    adminApi.getUsers()
      .then(setUsers)
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditUser(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, role: u.role, password: '' });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await adminApi.deleteUser(id);
      load();
    } catch {
      alert('Failed to delete user.');
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (editUser) {
        const body: Parameters<typeof adminApi.updateUser>[1] = {
          name: form.name,
          email: form.email,
          role: form.role,
        };
        if (form.password) body.password = form.password;
        await adminApi.updateUser(editUser.id, body);
      } else {
        await adminApi.createUser(form as Parameters<typeof adminApi.createUser>[0]);
      }
      setModalOpen(false);
      load();
    } catch {
      setError('Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (u: User) => (
        <span className="capitalize text-sm text-gray-700">{u.role.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (u: User) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(u)}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(u.id)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <TopBar
        title="Users"
        backTo="/admin"
        actions={<Button onClick={openCreate}>Add User</Button>}
      />
      <div className="p-6">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <Table columns={columns} data={users} keyExtractor={(u) => u.id} emptyMessage="No users found." />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editUser ? 'Edit User' : 'Add User'}
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jane Smith"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="jane@example.com"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="scanner_operator">Scanner Operator</option>
            </select>
          </div>
          <Input
            label={editUser ? 'New Password (leave blank to keep)' : 'Password'}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSubmit}>
              {editUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
