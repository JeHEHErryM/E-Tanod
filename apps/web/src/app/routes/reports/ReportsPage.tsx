import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BarChart3, Download, AlertTriangle } from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { Button, Card, Spinner, EmptyState, Input } from '@e-tanod/ui';
import { PageHeader } from '@/app/components/PageHeader';
import { formatDate } from '@/app/lib/format';

interface ComplianceRow {
  tanodId: string;
  fullName: string;
  username: string;
  assigned: number;
  completed: number;
  sessions: number;
  validScans: number;
  complianceRate: number;
}

interface ComplianceResponse {
  from: string;
  to: string;
  rows: ComplianceRow[];
}

const DAY_MS = 86_400_000;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function rateTone(rate: number): string {
  if (rate >= 80) return 'text-emerald-700 dark:text-emerald-300';
  if (rate >= 50) return 'text-amber-700 dark:text-amber-300';
  return 'text-rose-700 dark:text-rose-300';
}

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const today = new Date();
  const [from, setFrom] = useState(isoDay(new Date(today.getTime() - 30 * DAY_MS)));
  const [to, setTo] = useState(isoDay(today));
  const [downloading, setDownloading] = useState(false);

  const params = { from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z` };

  const { data, isLoading, error } = useQuery<ComplianceResponse>({
    queryKey: ['patrol-compliance', from, to],
    queryFn: async () =>
      (await api.get<ComplianceResponse>('/reports/patrol-compliance', { params })).data,
  });

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const response = await api.get('/reports/patrol-compliance.csv', {
        params,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `patrol-compliance-${from}_${to}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Swallow — the table query surfaces errors; CSV is a secondary action.
    } finally {
      setDownloading(false);
    }
  };

  const rows = data?.rows ?? [];
  const totals = rows.reduce(
    (acc, r) => ({
      assigned: acc.assigned + r.assigned,
      completed: acc.completed + r.completed,
      sessions: acc.sessions + r.sessions,
      validScans: acc.validScans + r.validScans,
    }),
    { assigned: 0, completed: 0, sessions: 0, validScans: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports.title')}
        description={t('reports.desc')}
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <Button variant="secondary" onClick={downloadCsv} disabled={downloading || rows.length === 0}>
            {downloading ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {t('reports.downloadCsv')}
          </Button>
        }
      />

      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-lg">
          <Input
            type="date"
            label={t('reports.from')}
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            type="date"
            label={t('reports.to')}
            value={to}
            min={from}
            max={isoDay(today)}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-brand-600" />
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {getErrorMessage(error)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" />}
          title={t('reports.emptyTitle')}
          description={t('reports.emptyDesc')}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t('reports.assigned'), value: totals.assigned },
              { label: t('reports.completed'), value: totals.completed },
              { label: t('reports.sessions'), value: totals.sessions },
              { label: t('reports.validScans'), value: totals.validScans },
            ].map((stat) => (
              <div key={stat.label} className="surface p-4">
                <div className="font-display text-2xl font-black text-ink-900">{stat.value}</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div className="surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                    <th className="px-4 py-3 font-semibold">{t('reports.tanod')}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t('reports.assigned')}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t('reports.completed')}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t('reports.sessions')}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t('reports.validScans')}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t('reports.compliance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.tanodId} className="border-b border-ink-50 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink-900">
                          {row.fullName || row.username}
                        </div>
                        <div className="text-xs text-ink-400">@{row.username}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-ink-600">{row.assigned}</td>
                      <td className="px-4 py-3 text-right text-ink-600">{row.completed}</td>
                      <td className="px-4 py-3 text-right text-ink-600">{row.sessions}</td>
                      <td className="px-4 py-3 text-right text-ink-600">{row.validScans}</td>
                      <td className={`px-4 py-3 text-right font-bold ${rateTone(row.complianceRate)}`}>
                        {row.complianceRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data ? (
            <p className="text-xs text-ink-400">
              {t('reports.range', {
                from: formatDate(data.from, i18n.language),
                to: formatDate(data.to, i18n.language),
              })}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
