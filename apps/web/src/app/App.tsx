import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import type { RoleName } from '@e-tanod/types';
import { AppLayout } from '@/app/layouts/AppLayout';
import { LoginPage } from '@/app/routes/auth/LoginPage';
import { SignupPage } from '@/app/routes/auth/SignupPage';
import { LandingPage } from '@/app/routes/landing/LandingPage';
import { DashboardPage } from '@/app/routes/dashboard/DashboardPage';
import { UsersPage } from '@/app/routes/users/UsersPage';
import { BarangaysPage } from '@/app/routes/barangays/BarangaysPage';
import { AuditPage } from '@/app/routes/audit/AuditPage';
import { PatrolPage } from '@/app/routes/patrol/PatrolPage';
import { SchedulesPage } from '@/app/routes/schedules/SchedulesPage';
import { ScanPage } from '@/app/routes/scan/ScanPage';
import { CheckpointsPage } from '@/app/routes/checkpoints/CheckpointsPage';
import { ResidentsPage } from '@/app/routes/residents/ResidentsPage';
import { IncidentsPage } from '@/app/routes/incidents/IncidentsPage';
import { ResidentReportsPage } from '@/app/routes/resident-reports/ResidentReportsPage';
import { ReportsPage } from '@/app/routes/reports/ReportsPage';
import { ResidentReportPage } from '@/app/routes/public/ResidentReportPage';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { useRealtime } from '@/app/hooks/useRealtime';
import { initSync, flush } from '@/lib/offline/queue';

const GisPage = lazy(() =>
  import('@/app/routes/gis/GisPage').then((m) => ({ default: m.GisPage })),
);

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-sm font-semibold text-ink-400">
      Loading…
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) {
    const to = location.pathname === '/' ? '/landing' : '/login';
    return <Navigate to={to} state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function RequireRole({ roles, children }: { roles: RoleName[]; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.primaryRole)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function LandingRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <LandingPage />;
}

function HomeRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Navigate to={isAuthenticated ? '/' : '/landing'} replace />;
}

function SignupRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <SignupPage />;
}

function RoleHome() {
  // Every role lands on the Dashboard; the page adapts its actions per role
  // (residents get "report/track" shortcuts, which link to /residents).
  return <DashboardPage />;
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useRealtime();

  useEffect(() => {
    if (isAuthenticated) {
      void fetchMe();
    }
  }, [isAuthenticated, fetchMe]);

  useEffect(() => {
    initSync();
  }, []);

  useEffect(() => {
    if (isAuthenticated) void flush();
  }, [isAuthenticated]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/landing" element={<LandingRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupRoute />} />
        <Route path="/report" element={<ResidentReportPage />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<RoleHome />} />

          <Route
            path="/patrol"
            element={
              <RequireRole roles={['SUPER_ADMIN', 'BARANGAY_ADMIN', 'TANOD']}>
                <PatrolPage />
              </RequireRole>
            }
          />
          <Route
            path="/schedules"
            element={
              <RequireRole roles={['SUPER_ADMIN', 'BARANGAY_ADMIN']}>
                <SchedulesPage />
              </RequireRole>
            }
          />
          <Route
            path="/scan"
            element={
              <RequireRole roles={['SUPER_ADMIN', 'BARANGAY_ADMIN', 'TANOD']}>
                <ScanPage />
              </RequireRole>
            }
          />
          <Route
            path="/checkpoints"
            element={
              <RequireRole roles={['SUPER_ADMIN', 'BARANGAY_ADMIN']}>
                <CheckpointsPage />
              </RequireRole>
            }
          />
          <Route
            path="/gis"
            element={
              <RequireRole roles={['SUPER_ADMIN', 'BARANGAY_ADMIN']}>
                <Suspense fallback={<PageFallback />}>
                  <GisPage />
                </Suspense>
              </RequireRole>
            }
          />
          <Route
            path="/residents"
            element={
              <RequireRole roles={['RESIDENT']}>
                <ResidentsPage />
              </RequireRole>
            }
          />
          <Route
            path="/incidents"
            element={
              <RequireRole roles={['SUPER_ADMIN', 'BARANGAY_ADMIN', 'TANOD']}>
                <IncidentsPage />
              </RequireRole>
            }
          />

          <Route
            path="/resident-reports"
            element={
              <RequireRole roles={['SUPER_ADMIN', 'BARANGAY_ADMIN']}>
                <ResidentReportsPage />
              </RequireRole>
            }
          />
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
          <Route
            path="/reports"
            element={
              <RequireRole roles={['SUPER_ADMIN', 'BARANGAY_ADMIN']}>
                <ReportsPage />
              </RequireRole>
            }
          />
        </Route>

        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </ErrorBoundary>
  );
}