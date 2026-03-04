import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import ToastContainer from '../components/ui/Toast';

// Pages
import LoginPage from '../pages/LoginPage';

// Admin
import AdminDashboard from '../pages/admin/AdminDashboard';
import UsersPage from '../pages/admin/UsersPage';
import InstitutionsPage from '../pages/admin/InstitutionsPage';
import AssignmentsPage from '../pages/admin/AssignmentsPage';

// Teacher
import TeacherDashboard from '../pages/teacher/TeacherDashboard';
import SessionOverviewPage from '../pages/teacher/SessionOverviewPage';
import SchemeUploadPage from '../pages/teacher/SchemeUploadPage';
import MarkingPage from '../pages/teacher/MarkingPage';

// Layout
import AppShell from '../components/layout/AppShell';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AppShell>
                <AdminDashboard />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute role="admin">
              <AppShell>
                <UsersPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/institutions"
          element={
            <ProtectedRoute role="admin">
              <AppShell>
                <InstitutionsPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/assignments"
          element={
            <ProtectedRoute role="admin">
              <AppShell>
                <AssignmentsPage />
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* Teacher routes */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute role="teacher">
              <AppShell>
                <TeacherDashboard />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/sessions/:id"
          element={
            <ProtectedRoute role="teacher">
              <AppShell>
                <SessionOverviewPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/sessions/:id/scheme"
          element={
            <ProtectedRoute role="teacher">
              <AppShell>
                <SchemeUploadPage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/sessions/:id/marking"
          element={
            <ProtectedRoute role="teacher">
              <MarkingPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
