import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Siren, Search, Crosshair, Copy, Check, ArrowLeft } from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { Button, Card, Spinner, Textarea, Input } from '@e-tanod/ui';
import { StatusLabel, incidentStatusTone } from '@/app/components/StatusLabel';
import { BrandWordmark } from '@/app/components/AppLogo';
import { formatDateTime } from '@/app/lib/format';
import type { IncidentStatus } from '@e-tanod/types';

interface CreateResponse {
  id: string;
  trackingCode: string;
  status: IncidentStatus;
  createdAt: string;
}

interface TrackResponse {
  trackingCode: string;
  status: IncidentStatus;
  createdAt: string;
  incident: {
    code: string;
    status: IncidentStatus;
    severity: string;
    category: string;
    reportedAt: string;
  } | null;
}

export function ResidentReportPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'report' | 'track'>('report');

  return (
    <div className="min-h-screen bg-sand-50 px-4 py-10 dark:bg-sand-950">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <BrandWordmark />
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('residentReport.backToLogin')}
          </Link>
        </div>

        <div>
          <h1 className="font-display text-2xl font-black text-ink-900 dark:text-ink-50">
            {t('residentReport.title')}
          </h1>
          <p className="mt-1 text-sm text-ink-500">{t('residentReport.desc')}</p>
        </div>

        <div className="flex gap-1 rounded-2xl bg-ink-100 p-1">
          {(['report', 'track'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                tab === value ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              {t(`residentReport.tab.${value}`)}
            </button>
          ))}
        </div>

        {tab === 'report' ? <ReportForm /> : <TrackForm />}
      </div>
    </div>
  );
}

function ReportForm() {
  const { t } = useTranslation();
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<CreateResponse | null>(null);

  const submit = useMutation({
    mutationFn: async () =>
      (
        await api.post<CreateResponse>('/resident-reports', {
          description,
          contact: contact.trim() || undefined,
          latitude: coords?.lat,
          longitude: coords?.lng,
        })
      ).data,
    onSuccess: (data) => setResult(data),
  });

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.trackingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  if (result) {
    return (
      <Card>
        <div className="space-y-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <Check className="h-7 w-7" />
          </span>
          <div>
            <h2 className="font-display text-xl font-black text-ink-900 dark:text-ink-50">
              {t('residentReport.successTitle')}
            </h2>
            <p className="mt-1 text-sm text-ink-500">{t('residentReport.successDesc')}</p>
          </div>
          <button
            type="button"
            onClick={copy}
            className="mx-auto flex items-center gap-2 rounded-xl border border-ink-200 bg-sand-50 px-4 py-3 font-mono text-lg font-bold tracking-wider text-ink-900 transition-colors hover:border-brand-300 dark:bg-sand-900 dark:text-ink-50"
          >
            {result.trackingCode}
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-ink-400" />}
          </button>
          <p className="text-xs text-ink-400">{t('residentReport.copyHint')}</p>
          <Button variant="secondary" fullWidth onClick={() => { setResult(null); setDescription(''); setContact(''); setCoords(null); }}>
            {t('residentReport.another')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (description.trim()) submit.mutate();
        }}
      >
        <Textarea
          label={t('residentReport.message')}
          placeholder={t('residentReport.messagePlaceholder')}
          rows={5}
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          label={t('residentReport.contact')}
          placeholder={t('residentReport.contactPlaceholder')}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
        <button
          type="button"
          onClick={locate}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-200 px-4 py-3 text-sm font-semibold text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          {locating ? <Spinner className="h-4 w-4" /> : <Crosshair className="h-4 w-4" />}
          {coords ? t('residentReport.locationCaptured') : t('residentReport.useLocation')}
        </button>

        {submit.error ? (
          <p className="text-sm font-medium text-rose-600">{getErrorMessage(submit.error)}</p>
        ) : null}

        <Button type="submit" fullWidth size="lg" disabled={submit.isPending || !description.trim()}>
          {submit.isPending ? <Spinner className="h-5 w-5" /> : <Siren className="h-5 w-5" />}
          {t('residentReport.submit')}
        </Button>
      </form>
    </Card>
  );
}

function TrackForm() {
  const { t, i18n } = useTranslation();
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');

  const { data, isFetching, error } = useQuery<TrackResponse>({
    queryKey: ['track-report', query],
    enabled: query.length > 0,
    retry: false,
    queryFn: async () => (await api.get<TrackResponse>(`/resident-reports/${query}`)).data,
  });

  return (
    <Card>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(code.trim().toUpperCase());
        }}
      >
        <Input
          label={t('residentReport.trackingCode')}
          placeholder="ET-XXXXXXXX"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Button type="submit" fullWidth disabled={isFetching || !code.trim()}>
          {isFetching ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          {t('residentReport.trackButton')}
        </Button>
      </form>

      {error ? (
        <p className="mt-4 text-sm font-medium text-rose-600">{t('residentReport.notFound')}</p>
      ) : null}

      {data ? (
        <div className="mt-5 space-y-3 border-t border-ink-100 pt-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-bold text-ink-900 dark:text-ink-50">
              {data.trackingCode}
            </span>
            <StatusLabel tone={incidentStatusTone(data.status)} label={t(`status.${data.status}`)} />
          </div>
          {data.incident ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                  {t('residentReport.category')}
                </dt>
                <dd className="font-semibold text-ink-800 dark:text-ink-100">{data.incident.category}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                  {t('residentReport.reportedAt')}
                </dt>
                <dd className="font-semibold text-ink-800 dark:text-ink-100">
                  {formatDateTime(data.incident.reportedAt, i18n.language)}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
