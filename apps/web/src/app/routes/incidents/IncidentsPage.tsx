import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Siren, Plus, MapPin, Clock, Check, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { api, getErrorMessage } from '@/services/api';
import { Button, Card, Spinner, EmptyState, Sheet, Input, Select, Textarea } from '@e-tanod/ui';
import type { IncidentStatus, IncidentSeverity, PaginatedResult } from '@e-tanod/types';
import { isAdmin } from '@/app/roles';
import { StatusLabel, incidentStatusTone, incidentSeverityTone } from '@/app/components/StatusLabel';
import { PageHeader } from '@/app/components/PageHeader';
import { formatDateTime } from '@/app/lib/format';

interface IncidentCategory {
  id: string;
  name: string;
  code: string;
  severity: IncidentSeverity;
}

interface IncidentItem {
  id: string;
  code: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedAt: string;
  latitude: number | null;
  longitude: number | null;
  category: { id: string; name: string; code: string };
  barangay: { id: string; name: string } | null;
  createdBy: { id: string; fullName: string; username: string } | null;
}

const severityDot: Record<IncidentSeverity, string> = {
  LOW: 'bg-emerald-400',
  MEDIUM: 'bg-sky-400',
  HIGH: 'bg-amber-500',
  CRITICAL: 'bg-rose-500',
};

export function IncidentsPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const admin = isAdmin(user?.primaryRole);
  const isResident = user?.primaryRole === 'RESIDENT';
  const canReport = user?.primaryRole === 'TANOD' || user?.primaryRole === 'RESIDENT';
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [filter, setFilter] = useState<IncidentStatus | 'ALL'>('ALL');
  const location = useLocation();

  useEffect(() => {
    if (canReport && (location.state as { openReport?: boolean } | null)?.openReport) {
      setReportOpen(true);
      window.history.replaceState({}, '');
    }
  }, [canReport, location.state]);

  const categories = useQuery<IncidentCategory[]>({
    queryKey: ['incident-categories'],
    queryFn: async () => (await api.get<IncidentCategory[]>('/incidents/categories')).data,
  });

  const incidents = useQuery<PaginatedResult<IncidentItem>>({
    queryKey: ['incidents'],
    queryFn: async () => (await api.get<PaginatedResult<IncidentItem>>('/incidents', { params: { page: 1, pageSize: 50 } })).data,
    enabled: !isResident,
  });

  const list = (incidents.data?.data ?? []).filter(
    (i) => filter === 'ALL' || i.status === filter,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('incidents.title')}
        description={admin ? t('incidents.adminDesc') : t('incidents.fieldDesc')}
        icon={<Siren className="h-5 w-5" />}
        actions={
          canReport ? (
            <Button onClick={() => setReportOpen(true)}>
              <Plus className="h-4 w-4" /> {t('incidents.report')}
            </Button>
          ) : null
        }
      />

      {/* Status filter chips */}
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

      {incidents.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-brand-600" />
        </div>
      ) : incidents.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {getErrorMessage(incidents.error)}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Siren className="h-8 w-8" />}
            title={isResident ? t('incidents.residentEmptyTitle') : filter === 'ALL' ? t('incidents.emptyTitle') : t('incidents.emptyFiltered', { status: t(`status.${filter}`) })}
            description={isResident ? t('incidents.residentEmptyDesc') : t('incidents.emptyDesc')}
            actionLabel={canReport ? t('incidents.emptyAction') : undefined}
            onAction={canReport ? () => setReportOpen(true) : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((i) => (
            <article
              key={i.id}
              className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition-shadow hover:shadow-card-hover"
            >
              <div
                className="flex items-center justify-between gap-3 border-l-4 px-4 py-3"
                style={{ borderLeftColor: `var(--sev-${i.severity.toLowerCase()})` }}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${severityDot[i.severity]}`} />
                  <span className="font-mono text-xs font-bold text-ink-400">{i.code}</span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
                  <StatusLabel tone={incidentSeverityTone(i.severity)} label={t(`severity.${i.severity}`)} />
                  <StatusLabel tone={incidentStatusTone(i.status)} label={t(`status.${i.status}`)} />
                </div>
              </div>

              <div className="px-4 py-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {i.category.name}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-ink-700">{i.description}</p>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDateTime(i.reportedAt, i18n.language)}
                  </span>
                  {i.barangay ? <span>· {i.barangay.name}</span> : null}
                  {i.createdBy ? <span>· {i.createdBy.fullName}</span> : null}
                  {i.latitude != null ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {i.latitude.toFixed(4)}, {i.longitude?.toFixed(4)}
                    </span>
                  ) : null}
                </div>

                {admin && i.status === 'PENDING' ? <IncidentActions incident={i} onDone={() => qc.invalidateQueries({ queryKey: ['incidents'] })} /> : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {canReport ? (
        <ReportSheet
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          categories={categories.data ?? []}
          onCreated={() => qc.invalidateQueries({ queryKey: ['incidents'] })}
        />
      ) : null}
    </div>
  );
}

function IncidentActions({ incident, onDone }: { incident: IncidentItem; onDone: () => void }) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const update = useMutation({
    mutationFn: (status: IncidentStatus) =>
      api.patch(`/incidents/${incident.id}/status`, { status, note: note || undefined }).then((r) => r.data),
    onSuccess: () => {
      setNote('');
      onDone();
    },
  });

  return (
    <div className="mt-4 space-y-2 border-t border-ink-100 pt-3">
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
    </div>
  );
}

function ReportSheet({
  open,
  onClose,
  categories,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  categories: IncidentCategory[];
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      let lat: number | undefined;
      let lng: number | undefined;
      if (coords.trim()) {
        const parts = coords.split(',').map((p) => parseFloat(p.trim()));
        if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
          lat = parts[0];
          lng = parts[1];
        } else {
          throw new Error(t('incidents.coordsError'));
        }
      }
      return (await api.post('/incidents', { categoryId, description, latitude: lat, longitude: lng })).data;
    },
    onSuccess: () => {
      onClose();
      setDescription('');
      setCoords('');
      setCategoryId('');
      setError(null);
      onCreated();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('incidents.sheetTitle')}
      footer={
        <Button
          fullWidth
          size="lg"
          disabled={create.isPending || !categoryId || !description.trim()}
          onClick={() => create.mutate()}
        >
          {create.isPending ? <Spinner className="h-5 w-5" /> : <Siren className="h-5 w-5" />}
          {t('incidents.submit')}
        </Button>
      }
    >
      <div className="space-y-4">
        <Select label={t('incidents.category')} required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="" disabled>
            {t('incidents.categorySelect')}
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Textarea
          label={t('incidents.description')}
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('incidents.descPlaceholder')}
        />
        <Input
          label={t('incidents.coords')}
          value={coords}
          onChange={(e) => setCoords(e.target.value)}
          placeholder={t('incidents.coordsPlaceholder')}
          hint={t('incidents.coordsHint')}
        />
        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      </div>
    </Sheet>
  );
}
