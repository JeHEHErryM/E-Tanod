import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Plus,
  Siren,
  MapPin,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  ImagePlus,
  Loader2,
} from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { Button, Card, Spinner, EmptyState, Sheet, Input, Select, Textarea } from '@e-tanod/ui';
import type { IncidentStatus, IncidentSeverity, PaginatedResult } from '@e-tanod/types';
import { StatusLabel, incidentStatusTone, incidentSeverityTone } from '@/app/components/StatusLabel';
import { PageHeader } from '@/app/components/PageHeader';
import { formatDateTime } from '@/app/lib/format';
import { uploadUrl, attachmentThumb } from '@/lib/config';

interface IncidentCategory {
  id: string;
  name: string;
  code: string;
  severity: IncidentSeverity;
}

interface IncidentAttachment {
  id: string;
  url: string;
  fileName: string;
}

interface MyIncident {
  id: string;
  code: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  isAnonymous: boolean;
  reportedAt: string;
  latitude: number | null;
  longitude: number | null;
  category: { id: string; name: string; code: string };
  barangay: { id: string; name: string } | null;
  attachments?: IncidentAttachment[];
}

export function ResidentsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if ((location.state as { openReport?: boolean } | null)?.openReport) {
      setReportOpen(true);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const categories = useQuery<IncidentCategory[]>({
    queryKey: ['incident-categories'],
    queryFn: async () => (await api.get<IncidentCategory[]>('/incidents/categories')).data,
  });

  const mine = useQuery<PaginatedResult<MyIncident>>({
    queryKey: ['incidents-mine'],
    queryFn: async () =>
      (await api.get<PaginatedResult<MyIncident>>('/incidents/mine', { params: { page: 1, pageSize: 50 } })).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('residents.title')}
        description={t('residents.desc')}
        icon={<Home className="h-5 w-5" />}
        actions={
          <Button onClick={() => setReportOpen(true)}>
            <Plus className="h-4 w-4" /> {t('residents.report')}
          </Button>
        }
      />

      {mine.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-brand-600" />
        </div>
      ) : mine.error && !mine.data ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {getErrorMessage(mine.error)}
        </div>
      ) : (mine.data?.data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            icon={<Siren className="h-8 w-8" />}
            title={t('residents.emptyTitle')}
            description={t('residents.emptyDesc')}
            actionLabel={t('residents.emptyAction')}
            onAction={() => setReportOpen(true)}
          />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {(mine.data?.data ?? []).map((i) => (
            <article
              key={i.id}
              className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition-shadow hover:shadow-card-hover"
            >
              <div
                className="flex items-center justify-between gap-3 border-l-4 px-4 py-3"
                style={{ borderLeftColor: `var(--sev-${i.severity.toLowerCase()})` }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-ink-400">{i.code}</span>
                  {i.isAnonymous ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                      <EyeOff className="h-3 w-3" /> {t('residents.anonymousTag')}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
                  <StatusLabel tone={incidentSeverityTone(i.severity)} label={t(`severity.${i.severity}`)} />
                  <StatusLabel tone={incidentStatusTone(i.status)} label={t(`status.${i.status}`)} />
                </div>
              </div>

              <div className="px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">{i.category.name}</span>
                <p className="mt-1 text-sm leading-relaxed text-ink-700">{i.description}</p>

                {i.attachments && i.attachments.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {i.attachments.map((a) => (
                      <a
                        key={a.id}
                        href={uploadUrl(a.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="block h-16 w-16 overflow-hidden rounded-lg border border-ink-200 transition-transform hover:scale-105"
                      >
                        <img src={attachmentThumb(a.url)} alt={a.fileName} className="h-full w-full object-cover" loading="lazy" />
                      </a>
                    ))}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDateTime(i.reportedAt, i18n.language)}
                  </span>
                  {i.barangay ? <span>· {i.barangay.name}</span> : null}
                  {i.latitude != null ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {i.latitude.toFixed(4)}, {i.longitude?.toFixed(4)}
                    </span>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        categories={categories.data ?? []}
        onCreated={() => qc.invalidateQueries({ queryKey: ['incidents-mine'] })}
      />
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
  const [anonymous, setAnonymous] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  // Once the incident row is created, keep its id so a failed attachment
  // upload never leads to a second (duplicate) incident on retry.
  const createdIncident = useRef<string | null>(null);

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
          throw new Error(t('residents.coordsError'));
        }
      }
      const payload = { categoryId, description, latitude: lat, longitude: lng, isAnonymous: anonymous };

      let incidentId = createdIncident.current;
      if (!incidentId) {
        const incident = (await api.post('/incidents', payload)).data;
        incidentId = incident.id;
        createdIncident.current = incident.id;
      }

      if (photos.length > 0) {
        const form = new FormData();
        photos.forEach((p) => form.append('files', p));
        await api.post(`/incidents/${incidentId}/attachments`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      return { id: incidentId };
    },
    onSuccess: () => {
      createdIncident.current = null;
      onClose();
      setDescription('');
      setCoords('');
      setCategoryId('');
      setAnonymous(false);
      setPhotos([]);
      setError(null);
      onCreated();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError(t('residents.noGeolocation'));
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError(t('residents.geolocationError'));
      },
      { timeout: 10000 },
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('residents.sheetTitle')}
      footer={
        <Button
          fullWidth
          size="lg"
          disabled={create.isPending || !categoryId || !description.trim()}
          onClick={() => create.mutate()}
        >
          {create.isPending ? <Spinner className="h-5 w-5" /> : <Siren className="h-5 w-5" />}
          {t('residents.submit')}
        </Button>
      }
    >
      <div className="space-y-4">
        <Select label={t('residents.category')} required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="" disabled>
            {t('residents.categorySelect')}
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Textarea
          label={t('residents.description')}
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('residents.descPlaceholder')}
        />

        <div className="space-y-2">
          <Input
            label={t('residents.coords')}
            value={coords}
            onChange={(e) => setCoords(e.target.value)}
            placeholder={t('residents.coordsPlaceholder')}
            hint={t('residents.coordsHint')}
          />
          <Button size="sm" variant="outline" onClick={useMyLocation} disabled={locating}>
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            {t('residents.useLocation')}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setAnonymous((v) => !v)}
          className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
            anonymous ? 'border-brand-500 bg-brand-50' : 'border-ink-200 bg-white hover:border-ink-300'
          }`}
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              anonymous ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500'
            }`}
          >
            {anonymous ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </span>
          <span>
            <span className="block text-sm font-bold text-ink-900">{t('residents.anonymousLabel')}</span>
            <span className="block text-xs text-ink-500">{t('residents.anonymousHint')}</span>
          </span>
        </button>

        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink-700">{t('residents.photos')}</span>
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-ink-200">
                <img src={URL.createObjectURL(p)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900/70 text-white dark:bg-black/60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {photos.length < 3 ? (
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ink-300 text-ink-400 transition-colors hover:border-brand-400 hover:text-brand-600">
                <ImagePlus className="h-5 w-5" />
                <span className="text-[10px] font-bold">{t('residents.addPhoto')}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setPhotos((prev) => [...prev, file].slice(0, 3));
                    e.target.value = '';
                  }}
                />
              </label>
            ) : null}
          </div>
          <p className="mt-1.5 text-xs text-ink-400">{t('residents.photosHint')}</p>
        </div>

        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      </div>
    </Sheet>
  );
}