import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types';

const roleDefaultPaths: Record<UserRole, string> = {
  admin: '/admin',
  teacher: '/teacher',
  scanner_operator: '/login',
};

interface ProtectedRouteProps {
  role: UserRole;
  children: ReactNode;
}

export default function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to={roleDefaultPaths[user.role]} replace />;
  }

  return <>{children}</>;
}
