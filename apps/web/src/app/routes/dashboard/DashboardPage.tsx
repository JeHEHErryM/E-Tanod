import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ShieldHalf,
  CheckCircle2,
  Siren,
  Inbox,
  AlertTriangle,
  QrCode,
  Plus,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { api, getErrorMessage } from '@/services/api';
import { Card, Badge, Stat, CardSkeleton, Button } from '@e-tanod/ui';
import type { DashboardStats } from '@e-tanod/types';
import { isAdmin, isField, roleMeta } from '@/app/roles';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const admin = isAdmin(user?.primaryRole);
  const field = isField(user?.primaryRole);
  const role = roleMeta(user?.primaryRole);

  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      if (!admin) return null as unknown as DashboardStats;
      const { data } = await api.get<DashboardStats>('/dashboard');
      return data;
    },
    enabled: admin,
  });

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-900 to-ink-950 p-6 text-sand-50 shadow-panel sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100">
              <role.icon className="h-3.5 w-3.5" />
              {role.label}
            </span>
            <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              {admin ? 'Command Center' : field ? "Maayong adlaw, Tanod." : 'Welcome back'},{' '}
              <span className="text-brand-200">{user?.fullName?.split(' ')[0] || user?.username}</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm text-brand-100/90">
              {admin
                ? 'Monitor patrols, verify incidents, and keep your barangay safe in real time.'
                : 'Your patrols, checkpoints, and incident reports — right at your fingertips.'}
            </p>
          </div>
          {field ? (
            <div className="flex shrink-0 gap-2.5">
              <Button variant="outline" className="border-white/25 bg-white/10 text-sand-50 hover:bg-white/20"
                onClick={() => undefined}>
                <QrCode className="h-4 w-4" /> Scan
              </Button>
              <Button className="bg-sand-50 text-brand-900 hover:bg-white" onClick={() => undefined}>
                <Plus className="h-4 w-4" /> Report
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {admin ? (
        <>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <CardSkeleton key={i} rows={1} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {getErrorMessage(error)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              <Stat label="Active Patrols" value={data?.activePatrols ?? 0} icon={<ShieldHalf className="h-5 w-5" />} accent="sky" />
              <Stat label="Completed Patrols" value={data?.completedPatrols ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} accent="emerald" />
              <Stat label="Today's Incidents" value={data?.todayIncidents ?? 0} icon={<Siren className="h-5 w-5" />} accent="rose" />
              <Stat label="Open Reports" value={data?.openReports ?? 0} icon={<Inbox className="h-5 w-5" />} accent="amber" />
              <Stat label="Missed Checkpoints" value={data?.missedCheckpoints ?? 0} icon={<AlertTriangle className="h-5 w-5" />} accent="brand" />
            </div>
          )}
        </>
      ) : field ? (
        <Card title="Quick actions" icon={<Layers className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Patrol', desc: 'Start or view patrols', icon: ShieldHalf, to: '/patrol', tint: 'bg-sky-50 text-sky-700' },
              { label: 'Scan', desc: 'Verify checkpoints', icon: QrCode, to: '/scan', tint: 'bg-brand-50 text-brand-700' },
              { label: 'Incidents', desc: 'Report or track', icon: Siren, to: '/incidents', tint: 'bg-rose-50 text-rose-700' },
            ].map((q) => (
              <QuickAction key={q.label} {...q} />
            ))}
          </div>
        </Card>
      ) : (
        <Card title="Your home">
          <p className="text-sm text-ink-600">
            You are logged in as <Badge tone={role.tone}>{role.label}</Badge>. Explore your dashboard to
            manage patrols, checkpoints, incidents, and community reports.
          </p>
        </Card>
      )}
    </div>
  );
}

function QuickAction({
  label,
  desc,
  icon: Icon,
  to,
  tint,
}: {
  label: string;
  desc: string;
  icon: typeof ShieldHalf;
  to: string;
  tint: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4 text-left transition-all hover:border-brand-200 hover:shadow-card-hover"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tint}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink-900">{label}</span>
        <span className="block text-xs text-ink-500">{desc}</span>
      </span>
    </button>
  );
}
