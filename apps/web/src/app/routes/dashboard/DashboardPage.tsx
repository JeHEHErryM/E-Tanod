import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { Card, Stat, CardSkeleton, Button } from '@e-tanod/ui';
import { AppLogo } from '@/app/components/AppLogo';
import type { DashboardStats } from '@e-tanod/types';
import { isAdmin, isField, roleMeta } from '@/app/roles';

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const admin = isAdmin(user?.primaryRole);
  const field = isField(user?.primaryRole);
  const isTanod = user?.primaryRole === 'TANOD';
  const role = roleMeta(user?.primaryRole);

  const quickActions = isTanod
    ? [
        { labelKey: 'dashboard.qa.patrol', icon: ShieldHalf, to: '/patrol', tint: 'bg-sky-50 text-sky-700' },
        { labelKey: 'dashboard.qa.scan', icon: QrCode, to: '/scan', tint: 'bg-brand-50 text-brand-700' },
        { labelKey: 'dashboard.qa.incidents', icon: Siren, to: '/incidents', tint: 'bg-rose-50 text-rose-700' },
      ]
    : [
        { labelKey: 'dashboard.qa.report', icon: Plus, to: '/incidents', state: { openReport: true }, tint: 'bg-rose-50 text-rose-700' },
        { labelKey: 'dashboard.qa.track', icon: Siren, to: '/incidents', tint: 'bg-brand-50 text-brand-700' },
      ];

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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <AppLogo size={64} light />
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100">
                <role.icon className="h-3.5 w-3.5" />
                {t(`role.${user?.primaryRole ?? 'SUPER_ADMIN'}`)}
              </span>
              <h1 className="mt-3 font-display text-2xl font-black tracking-tight text-balance sm:text-3xl">
                {admin ? t('dashboard.heroAdmin') : isTanod ? t('dashboard.heroFieldTanod') : t('dashboard.heroField')},{' '}
                <span className="text-brand-200">{user?.fullName?.split(' ')[0] || user?.username}</span>
              </h1>
              <p className="mt-2 max-w-lg text-sm text-brand-100/90">
                {admin ? t('dashboard.heroAdminDesc') : t('dashboard.heroFieldDesc')}
              </p>
            </div>
          </div>
          {field ? (
            <div className="flex shrink-0 gap-2.5">
              {isTanod ? (
                <Button variant="outline" className="border-white/25 bg-white/10 text-sand-50 hover:bg-white/20"
                  onClick={() => navigate('/scan')}>
                  <QrCode className="h-4 w-4" /> {t('dashboard.scan')}
                </Button>
              ) : null}
              <Button className="bg-sand-50 text-brand-900 hover:bg-white" onClick={() => navigate('/incidents', { state: { openReport: true } })}>
                <Plus className="h-4 w-4" /> {t('dashboard.report')}
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
              <Stat label={t('dashboard.stats.activePatrols')} value={data?.activePatrols ?? 0} icon={<ShieldHalf className="h-5 w-5" />} accent="sky" />
              <Stat label={t('dashboard.stats.completedPatrols')} value={data?.completedPatrols ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} accent="emerald" />
              <Stat label={t('dashboard.stats.todayIncidents')} value={data?.todayIncidents ?? 0} icon={<Siren className="h-5 w-5" />} accent="rose" />
              <Stat label={t('dashboard.stats.openReports')} value={data?.openReports ?? 0} icon={<Inbox className="h-5 w-5" />} accent="amber" />
              <Stat label={t('dashboard.stats.missedCheckpoints')} value={data?.missedCheckpoints ?? 0} icon={<AlertTriangle className="h-5 w-5" />} accent="brand" />
            </div>
          )}
        </>
      ) : field ? (
        <Card title={t('dashboard.qaTitle')} icon={<Layers className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((q) => (
              <QuickAction key={q.labelKey} {...q} />
            ))}
          </div>
        </Card>
      ) : (
        <Card title={t('dashboard.homeTitle')}>
          <p className="text-sm text-ink-600">
            {t('dashboard.homeDesc', { role: t(`role.${user?.primaryRole ?? 'SUPER_ADMIN'}`) })}
          </p>
        </Card>
      )}
    </div>
  );
}

function QuickAction({
  labelKey,
  icon: Icon,
  to,
  tint,
  state,
}: {
  labelKey: string;
  icon: typeof ShieldHalf;
  to: string;
  tint: string;
  state?: Record<string, unknown>;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to, { state })}
      className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4 text-left transition-all hover:border-brand-200 hover:shadow-card-hover"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tint}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink-900">{t(`${labelKey}.label`)}</span>
        <span className="block text-xs text-ink-500">{t(`${labelKey}.desc`)}</span>
      </span>
    </button>
  );
}
