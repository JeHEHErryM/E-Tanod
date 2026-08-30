import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import type { RoleName } from '@e-tanod/types';
import { AppLayout } from '@/app/layouts/AppLayout';
import { LoginPage } from '@/app/routes/auth/LoginPage';
import { DashboardPage } from '@/app/routes/dashboard/DashboardPage';
import { UsersPage } from '@/app/routes/users/UsersPage';
import { BarangaysPage } from '@/app/routes/barangays/BarangaysPage';
import { AuditPage } from '@/app/routes/audit/AuditPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function RequireRole({ roles, children }: { roles: RoleName[]; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.primaryRole)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, fetchMe } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      void fetchMe();
    }
  }, [isAuthenticated, fetchMe]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />

        <Route
          path="/users"
          element={
            <RequireRole roles={['SUPER_ADMIN', 'BARANGAY_ADMIN']}>
              <UsersPage />
            </RequireRole>
          }
        />
        <Route
          path="/barangays"
          element={
            <RequireRole roles={['SUPER_ADMIN']}>
              <BarangaysPage />
            </RequireRole>
          }
        />
        <Route
          path="/audit"
          element={
            <RequireRole roles={['SUPER_ADMIN', 'BARANGAY_ADMIN']}>
              <AuditPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
