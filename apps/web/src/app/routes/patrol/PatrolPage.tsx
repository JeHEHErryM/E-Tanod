import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ShieldHalf,
  MapPin,
  Play,
  Square,
  Clock,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { api, getErrorMessage } from '@/services/api';
import { Button, Card, Spinner, EmptyState, Sheet, Textarea } from '@e-tanod/ui';
import type { PatrolStatus } from '@e-tanod/types';
import { isAdmin } from '@/app/roles';
import { StatusLabel, patrolStatusTone } from '@/app/components/StatusLabel';
import { PageHeader } from '@/app/components/PageHeader';
import { formatDate, timeAgo } from '@/app/lib/format';
import { enqueue, isNetworkError, isOffline } from '@/lib/offline/queue';

interface Assignment {
  id: string;
  status: PatrolStatus;
  scheduledAt: string;
  patrolSchedule: {
    id: string;
    title: string;
    description?: string | null;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    requiredCheckpoints: { checkpoint: { id: string; name: string; code: string } }[];
  };
}

interface ActiveSession {
  id: string;
  startedAt: string;
  patrolAssignment: {
    patrolSchedule: { title: string; scheduledDate: string; startTime: string; endTime: string };
  };
  checkpointScans: { checkpoint: { name: string }; result: string; scannedAt: string }[];
}

interface MonitorSession {
  id: string;
  tanod: { id: string; fullName: string; username: string };
  startedAt: string;
  schedule: string;
  barangay: string | null;
  lastSeenAt: string | null;
  lastLocation: { latitude: number; longitude: number; accuracy: number | null } | null;
  checkpointScans: number;
}

function freshnessTone(lastSeenAt: string | null): 'success' | 'warning' | 'danger' {
  if (!lastSeenAt) return 'danger';
  const age = Date.now() - new Date(lastSeenAt).getTime();
  if (age <= 60_000) return 'success';
  if (age <= 180_000) return 'warning';
  return 'danger';
}

export function PatrolPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const admin = isAdmin(user?.primaryRole);
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');
  const [endSheetOpen, setEndSheetOpen] = useState(false);

  const assignments = useQuery<Assignment[]>({
    queryKey: ['my-assignments'],
    queryFn: async () => (await api.get<Assignment[]>('/patrol/assignments')).data,
  });

  const active = useQuery<ActiveSession | null>({
    queryKey: ['active-session'],
    // The endpoint returns an empty 200 body when there's no active session,
    // which axios turns into "" — normalize to null so downstream truthiness
    // checks and optional chaining behave.
    queryFn: async () => {
      const res = await api.get<ActiveSession | null>('/patrol/session/active');
      return res.data && typeof res.data === 'object' ? res.data : null;
    },
  });

  const monitor = useQuery<MonitorSession[]>({
    queryKey: ['patrol-monitor'],
    enabled: admin,
    refetchInterval: 15_000,
    queryFn: async () => (await api.get<MonitorSession[]>('/patrol/monitor')).data,
  });

  const startPatrol = useMutation({
    mutationFn: (patrolAssignmentId: string) =>
      api.post('/patrol/start', { patrolAssignmentId }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-session'] });
      qc.invalidateQueries({ queryKey: ['my-assignments'] });
    },
  });

  const endPatrol = useMutation({
    mutationFn: (sessionId: string) =>
      api.post(`/patrol/session/${sessionId}/end`, { notes }).then((r) => r.data),
    onSuccess: () => {
      setNotes('');
      setEndSheetOpen(false);
      qc.invalidateQueries({ queryKey: ['active-session'] });
      qc.invalidateQueries({ queryKey: ['my-assignments'] });
    },
  });

  const verified = (active.data?.checkpointScans ?? []).filter((s) => s.result === 'VALID').length;

  // Live patrol tracking: while a tanod has an active session, stream device
  // GPS fixes to the patrol record (throttled) so supervisors see the route.
  const activeSessionId = active.data?.id ?? null;
  const isTanod = user?.primaryRole === 'TANOD';
  useEffect(() => {
    if (!isTanod || !activeSessionId || !navigator.geolocation) return;
    let watchId: number | null = null;
    let lastSent = 0;
    const post = (latitude: number, longitude: number, accuracy?: number) => {
      const payload = { latitude, longitude, accuracy };
      if (isOffline()) {
        void enqueue({ entityType: 'PATROL_LOCATION', entityId: activeSessionId, payload });
        return;
      }
      api
        .post(`/patrol/session/${activeSessionId}/location`, payload)
        .catch((error) => {
          if (isNetworkError(error)) {
            void enqueue({ entityType: 'PATROL_LOCATION', entityId: activeSessionId, payload });
          }
        });
    };
    const onPosition = (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastSent >= 15_000) {
        lastSent = now;
        post(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      }
    };
    watchId = navigator.geolocation.watchPosition(
      onPosition,
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [isTanod, activeSessionId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('patrol.title')}
        description={admin ? t('patrol.adminDesc') : t('patrol.fieldDesc')}
        icon={<ShieldHalf className="h-5 w-5" />}
      />

      {!admin && active.data ? (
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 to-brand-800 p-5 text-white shadow-panel">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              {t('patrol.activeBanner')}
            </span>
          </div>
          <div className="mt-4">
            <h3 className="font-display text-xl font-black">
              {active.data.patrolAssignment.patrolSchedule.title}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/90">
              <Clock className="h-4 w-4" />
              {active.data.patrolAssignment.patrolSchedule.startTime} –{' '}
              {active.data.patrolAssignment.patrolSchedule.endTime}
            </p>
          </div>
          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-200" />
              {t('patrol.verified', { count: verified })}
            </div>
            <Button variant="danger" onClick={() => setEndSheetOpen(true)}>
              <Square className="h-4 w-4" /> {t('patrol.end')}
            </Button>
          </div>
        </div>
      ) : !admin && active.isLoading ? (
        <Spinner className="text-brand-600" />
      ) : null}

      {admin && active.data ? (
        <Card
          title={t('patrol.adminActiveTitle')}
          icon={<MapPin className="h-4 w-4" />}
          actions={<StatusLabel tone="success" label={t('patrol.active')} />}
        >
          <p className="text-sm text-ink-600">
            <span className="font-semibold text-ink-900">
              {active.data.patrolAssignment.patrolSchedule.title}
            </span>{' '}
            {t('patrol.verifiedCheckpoints', { count: verified })}
          </p>
          <Button variant="danger" size="sm" className="mt-3" onClick={() => setEndSheetOpen(true)}>
            <Square className="h-4 w-4" /> {t('patrol.endShort')}
          </Button>
        </Card>
      ) : null}

      {admin ? (
        <Card
          title={t('patrol.liveTitle')}
          icon={<Radio className="h-4 w-4" />}
          actions={
            monitor.isFetching ? <Spinner className="h-4 w-4 text-brand-600" /> : undefined
          }
        >
          {monitor.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="text-brand-600" />
            </div>
          ) : (monitor.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-500">{t('patrol.liveEmpty')}</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {(monitor.data ?? []).map((s) => {
                const tone = freshnessTone(s.lastSeenAt);
                const ago = timeAgo(s.lastSeenAt);
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-ink-900">
                        {s.tanod.fullName || s.tanod.username}
                      </div>
                      <div className="truncate text-xs text-ink-400">
                        {s.schedule}
                        {s.barangay ? ` · ${s.barangay}` : ''} ·{' '}
                        {t('patrol.scansCount', { count: s.checkpointScans })}
                      </div>
                    </div>
                    <StatusLabel
                      tone={tone}
                      label={
                        s.lastSeenAt
                          ? t('patrol.lastSeen', { ago: ago ?? '' })
                          : t('patrol.noSignal')
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}

      <Card
        title={admin ? t('patrol.allAssignments') : t('patrol.myAssignments')}
        icon={<ShieldHalf className="h-4 w-4" />}
      >
        {assignments.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="text-brand-600" />
          </div>
        ) : assignments.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {getErrorMessage(assignments.error)}
          </div>
        ) : (assignments.data ?? []).length === 0 ? (
          <EmptyState
            icon={<ShieldHalf className="h-8 w-8" />}
            title={t('patrol.emptyTitle')}
            description={t('patrol.emptyDesc')}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {assignments.data!.map((a) => {
              const canStart = !admin && a.status === 'SCHEDULED' && !active.data;
              return (
                <div
                  key={a.id}
                  className="group flex flex-col rounded-2xl border border-ink-100 bg-white p-4 transition-all hover:border-brand-200 hover:shadow-card-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                        <MapPin className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="font-bold text-ink-900">{a.patrolSchedule.title}</div>
                        <div className="text-xs text-ink-400">{formatDate(a.patrolSchedule.scheduledDate, i18n.language)}</div>
                      </div>
                    </div>
                    <StatusLabel tone={patrolStatusTone(a.status)} label={t(`patrolStatus.${a.status}`)} />
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-sm text-ink-500">
                    <Clock className="h-4 w-4 text-ink-400" />
                    {a.patrolSchedule.startTime} – {a.patrolSchedule.endTime}
                  </div>

                  <div className="mt-2 text-xs text-ink-400">
                    {t('patrol.checkpoints', { count: a.patrolSchedule.requiredCheckpoints.length })}
                    <span> · </span>
                    {a.patrolSchedule.requiredCheckpoints.map((c) => c.checkpoint.name).join(', ')}
                  </div>

                  {canStart ? (
                    <div className="mt-4 border-t border-ink-100 pt-3">
                      <Button
                        fullWidth
                        variant="primary"
                        onClick={() => startPatrol.mutate(a.id)}
                        disabled={startPatrol.isPending}
                      >
                        {startPatrol.isPending ? <Spinner className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {t('patrol.start')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Sheet
        open={endSheetOpen}
        onClose={() => setEndSheetOpen(false)}
        title={t('patrol.endSheetTitle')}
        footer={
          <Button
            variant="danger"
            fullWidth
            size="lg"
            disabled={endPatrol.isPending}
            onClick={() => active.data && endPatrol.mutate(active.data.id)}
          >
            {endPatrol.isPending ? <Spinner className="h-5 w-5" /> : <Square className="h-5 w-5" />}
            {t('patrol.confirmEnd')}
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-500">{t('patrol.endHint')}</p>
          <Textarea
            label={t('patrol.endNotes')}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('patrol.endPlaceholder')}
          />
        </div>
      </Sheet>
    </div>
  );
}
