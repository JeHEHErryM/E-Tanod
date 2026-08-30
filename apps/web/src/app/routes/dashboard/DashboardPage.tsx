import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { api, getErrorMessage } from '@/services/api';
import { Card, Badge } from '@e-tanod/ui';
import type { DashboardStats } from '@e-tanod/types';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.primaryRole === 'SUPER_ADMIN' || user?.primaryRole === 'BARANGAY_ADMIN';

  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      if (!isAdmin) return null as unknown as DashboardStats;
      const { data } = await api.get<DashboardStats>('/dashboard');
      return data;
    },
    enabled: isAdmin,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.fullName ?? user?.username}</h1>
        <p className="text-sm text-gray-500">E-Tanod Dashboard</p>
      </div>

      {isAdmin ? (
        <>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading dashboard...</p>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {getErrorMessage(error)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <StatCard label="Active Patrols" value={data?.activePatrols ?? 0} />
              <StatCard label="Completed Patrols" value={data?.completedPatrols ?? 0} />
              <StatCard label="Today's Incidents" value={data?.todayIncidents ?? 0} />
              <StatCard label="Open Reports" value={data?.openReports ?? 0} />
              <StatCard label="Missed Checkpoints" value={data?.missedCheckpoints ?? 0} />
            </div>
          )}
        </>
      ) : (
        <Card title="Your Role">
          <p className="text-sm text-gray-600">
            You are logged in as <Badge tone="info">{user?.primaryRole}</Badge>. Further modules (patrol,
            checkpoints, GIS, incidents, resident portal) are being developed in the next increments.
          </p>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-2xl font-bold text-brand-700">{value}</div>
      <div className="mt-1 text-xs font-medium text-gray-500">{label}</div>
    </div>
  );
}
