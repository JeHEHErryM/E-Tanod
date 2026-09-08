import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QrCode, MapPin, CheckCircle2, XCircle, Crosshair, ScanLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth';
import { api, getErrorMessage } from '@/services/api';
import { Button, Badge, Card, Spinner, Input } from '@e-tanod/ui';
import type { ScanResult } from '@e-tanod/types';
import { isAdmin } from '@/app/roles';
import { PageHeader } from '@/app/components/PageHeader';
import { formatTime } from '@/app/lib/format';

interface ScanResponse {
  result: ScanResult;
  failureReason: string | null;
  scannedAt: string;
  checkpoint: { id: string; code: string; name: string } | null;
}

interface ActiveSession {
  id: string;
  startedAt: string;
  patrolAssignment: {
    patrolSchedule: { id: string; title: string; scheduledDate: string; startTime: string; endTime: string };
  };
  checkpointScans: { checkpoint: { id: string; name: string }; result: string; scannedAt: string }[];
}

export function ScanPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isTanod = user?.primaryRole === 'TANOD';
  const admin = isAdmin(user?.primaryRole);
  const qc = useQueryClient();
  const [token, setToken] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null);
  const [hasLocation, setHasLocation] = useState(false);
  const [locating, setLocating] = useState(false);

  const active = useQuery<ActiveSession | null>({
    queryKey: ['active-session'],
    queryFn: async () => (await api.get<ActiveSession | null>('/patrol/session/active')).data,
  });

  const locate = () =>
    new Promise<{ latitude: number; longitude: number; accuracy?: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this device'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        (err) => reject(new Error(err.message)),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    });

  const captureLocation = async () => {
    setLocationError(null);
    setLocating(true);
    try {
      await locate();
      setHasLocation(true);
    } catch (e) {
      setHasLocation(false);
      setLocationError(getErrorMessage(e));
    } finally {
      setLocating(false);
    }
  };

  const scan = useMutation({
    mutationFn: async () => {
      const pos = await locate();
      const res = await api.post<ScanResponse>('/checkpoints/scan', {
        token: token.trim(),
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setLastResult(data);
      setHasLocation(true);
      if (data.result === 'VALID') {
        qc.invalidateQueries({ queryKey: ['active-session'] });
      }
    },
    onError: (e) => setLocationError(getErrorMessage(e)),
  });

  const resMeta = lastResult
    ? {
        title: t(`scan.result.${lastResult.result}.title`),
        desc: t(`scan.result.${lastResult.result}.desc`),
      }
    : null;
  const success = lastResult?.result === 'VALID';

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title={t('scan.title')}
        description={isTanod ? t('scan.tanodDesc') : t('scan.adminDesc')}
        icon={<QrCode className="h-5 w-5" />}
      />

      {isTanod && active.data ? (
        <Card title={t('scan.activePatrol')} icon={<ScanLine className="h-4 w-4" />} actions={<Badge tone="success" dot>{t('patrol.live')}</Badge>}>
          <p className="text-sm text-ink-600">
            <span className="font-semibold text-ink-900">{active.data.patrolAssignment.patrolSchedule.title}</span>
            <span className="text-ink-400"> ·{' '}
              {t('scan.verified', { count: active.data.checkpointScans.filter((s) => s.result === 'VALID').length })}</span>
          </p>
        </Card>
      ) : null}

      {isTanod && !active.data && !active.isLoading ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {t('scan.needsActive')}
        </div>
      ) : null}

      <div className="space-y-4">
        <Card>
          <div className="mb-4 flex items-center gap-3">
            {hasLocation ? (
              <Badge tone="success" dot>
                {t('scan.locationCaptured')}
              </Badge>
            ) : (
              <Badge tone="warning" dot>
                {t('scan.locationRequired')}
              </Badge>
            )}
          </div>

          <div className="rounded-2xl bg-sand-50 p-5 text-center">
            <button
              onClick={captureLocation}
              disabled={locating}
              className="group inline-flex flex-col items-center gap-3"
            >
              <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-brand-200 bg-white text-brand-700 shadow-soft transition-transform group-hover:scale-105 group-active:scale-95">
                {locating ? (
                  <Spinner className="h-8 w-8" />
                ) : hasLocation ? (
                  <CheckCircle2 className="h-9 w-9 text-emerald-500" />
                ) : (
                  <Crosshair className="h-9 w-9" />
                )}
              </span>
              <span className="text-sm font-semibold text-ink-700">
                {locating ? t('scan.locating') : hasLocation ? t('scan.locationCaptured') : t('scan.captureLocation')}
              </span>
            </button>
            {locationError ? (
              <p className="mt-3 text-sm font-medium text-rose-600">{locationError}</p>
            ) : null}
          </div>

          <div className="mt-5 space-y-3">
            <Input
              label={t('scan.qrToken')}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t('scan.qrPlaceholder')}
              leading={<QrCode className="h-5 w-5" />}
            />
            <Button
              fullWidth
              size="lg"
              onClick={() => scan.mutate()}
              disabled={!token.trim() || !hasLocation || scan.isPending || (isTanod && !active.data)}
            >
              {scan.isPending ? <Spinner className="h-5 w-5" /> : <ScanLine className="h-5 w-5" />}
              {t('scan.verify')}
            </Button>
            {!isTanod && !admin ? (
              <p className="text-center text-xs text-ink-400">{t('scan.onlyTanod')}</p>
            ) : null}
          </div>
        </Card>

        {lastResult && resMeta ? (
          <div
            className={`overflow-hidden rounded-3xl border p-5 shadow-card ${
              success ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
            }`}
          >
            <div className="mb-3 flex items-center gap-3">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white ${
                  success ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              >
                {success ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
              </span>
              <div>
                <h3 className={`font-display text-lg font-black ${success ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {resMeta.title}
                </h3>
                {lastResult.checkpoint ? (
                  <p className="text-sm font-medium text-ink-600">
                    {lastResult.checkpoint.name} ({lastResult.checkpoint.code})
                  </p>
                ) : null}
              </div>
            </div>
            <p className={`text-sm ${success ? 'text-emerald-800' : 'text-rose-800'}`}>
              {lastResult.failureReason ?? resMeta.desc}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-ink-400">
              <MapPin className="h-3.5 w-3.5" />
              {t('scan.scannedAt', { time: formatTime(lastResult.scannedAt, i18n.language) })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
