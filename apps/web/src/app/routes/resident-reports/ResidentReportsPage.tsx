import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Inbox, Clock, Check, X, Trash2, MapPin } from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { Button, Card, Spinner, EmptyState, Input } from '@e-tanod/ui';
import type { IncidentStatus, IncidentSeverity, PaginatedResult } from '@e-tanod/types';
import { StatusLabel, incidentStatusTone, incidentSeverityTone } from '@/app/components/StatusLabel';
import { PageHeader } from '@/app/components/PageHeader';
import { formatDateTime } from '@/app/lib/format';

interface ResidentReportItem {
  id: string;
  trackingCode: string;
  status: IncidentStatus;
  isAnonymous: boolean;
  contact: string | null;
  message: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  barangay: { id: string; name: string } | null;
  incident: {
    id: string;
    code: string;
    status: IncidentStatus;
    severity: IncidentSeverity;
    category: { id: string; name: string };
    reportedAt: string;
  } | null;
}

export function ResidentReportsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<IncidentStatus | 'ALL'>('ALL');

  const reports = useQuery<PaginatedResult<ResidentReportItem>>({
    queryKey: ['resident-reports', filter],
    queryFn: async () =>
      (
        await api.get<PaginatedResult<ResidentReportItem>>('/resident-reports', {
          params: { page: 1, pageSize: 50, status: filter === 'ALL' ? undefined : filter },
        })
      ).data,
  });

  const list = reports.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('residentReports.title')}
        description={t('residentReports.desc')}
        icon={<Inbox className="h-5 w-5" />}
      />

      <div className="flex flex-wrap gap-2">
        {(['ALL', 'PENDING', 'VERIFIED', 'RESOLVED', 'REJECTED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              filter === s
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-ink-200 bg-white text-ink-500 hover:border-brand-300'
            }`}
          >
            {s === 'ALL' ? t('incidents.all') : t(`status.${s}`)}
          </button>
        ))}
      </div>

      {reports.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-brand-600" />
        </div>
      ) : reports.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {getErrorMessage(reports.error)}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Inbox className="h-8 w-8" />}
            title={t('residentReports.emptyTitle')}
            description={t('residentReports.emptyDesc')}
          />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((r) => (
            <article
              key={r.id}
              className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition-shadow hover:shadow-card-hover"
            >
              <div className="flex items-center justify-between gap-3 border-b border-ink-50 px-4 py-3">
                <span className="font-mono text-xs font-bold text-ink-400">{r.trackingCode}</span>
                <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
                  {r.incident ? (
                    <StatusLabel
                      tone={incidentSeverityTone(r.incident.severity)}
                      label={t(`severity.${r.incident.severity}`)}
                    />
                  ) : null}
                  <StatusLabel
                    tone={incidentStatusTone(r.status)}
                    label={t(`status.${r.status}`)}
                  />
                </div>
              </div>

              <div className="px-4 py-3">
                {r.incident ? (
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {r.incident.category.name} · {r.incident.code}
                  </div>
                ) : null}
                <p className="text-sm leading-relaxed text-ink-700">
                  {r.message ?? t('residentReports.noMessage')}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDateTime(r.createdAt, i18n.language)}
                  </span>
                  {r.barangay ? <span>· {r.barangay.name}</span> : null}
                  <span>· {r.isAnonymous ? t('residentReports.anonymous') : r.contact ?? t('residentReports.noContact')}</span>
                  {r.latitude != null ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {r.latitude.toFixed(4)}, {r.longitude?.toFixed(4)}
                    </span>
                  ) : null}
                </div>

                <ReportActions
                  report={r}
                  onDone={() => qc.invalidateQueries({ queryKey: ['resident-reports'] })}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportActions({ report, onDone }: { report: ResidentReportItem; onDone: () => void }) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = useMutation({
    mutationFn: (status: IncidentStatus) =>
      api
        .patch(`/resident-reports/${report.id}/status`, { status, note: note || undefined })
        .then((r) => r.data),
    onSuccess: () => {
      setNote('');
      onDone();
    },
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/resident-reports/${report.id}`).then((r) => r.data),
    onSuccess: () => onDone(),
  });

  return (
    <div className="mt-4 space-y-2 border-t border-ink-100 pt-3">
      {report.status === 'PENDING' ? (
        <>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('incidents.notePlaceholder')}
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button size="sm" variant="outline" onClick={() => update.mutate('VERIFIED')} disabled={update.isPending}>
              <Check className="h-4 w-4" /> {t('incidents.verify')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => update.mutate('RESOLVED')} disabled={update.isPending}>
              <Check className="h-4 w-4" /> {t('incidents.resolve')}
            </Button>
            <Button size="sm" variant="danger" onClick={() => update.mutate('REJECTED')} disabled={update.isPending}>
              <X className="h-4 w-4" /> {t('incidents.reject')}
            </Button>
          </div>
        </>
      ) : null}

      {confirmDelete ? (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="danger" onClick={() => remove.mutate()} disabled={remove.isPending}>
            {remove.isPending ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
            {t('residentReports.confirmDelete')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-4 w-4" /> {t('residentReports.delete')}
        </Button>
      )}
    </div>
  );
}
