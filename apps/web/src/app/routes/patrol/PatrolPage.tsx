import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldHalf,
  MapPin,
  Play,
  Square,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { api, getErrorMessage } from '@/services/api';
import { Button, Badge, Card, Spinner, EmptyState, Sheet, Textarea } from '@e-tanod/ui';
import type { PatrolStatus } from '@e-tanod/types';
import { isAdmin } from '@/app/roles';
import { patrolStatusTone } from '@/app/badges';
import { PageHeader } from '@/app/components/PageHeader';

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

function formatDate(d: string) {
  const date = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

export function PatrolPage() {
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
    queryFn: async () => (await api.get<ActiveSession | null>('/patrol/session/active')).data,
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

  const verified = active.data?.checkpointScans.filter((s) => s.result === 'VALID').length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patrol"
        description={admin ? 'Monitor schedules and assignments' : 'Your patrol assignments'}
        icon={<ShieldHalf className="h-5 w-5" />}
      />

      {!admin && active.data ? (
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 to-brand-800 p-5 text-sand-50 shadow-panel">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              ACTIVE PATROL
            </span>
            <Badge tone="success">Live</Badge>
          </div>
          <div className="mt-4">
            <h3 className="font-display text-xl font-bold">
              {active.data.patrolAssignment.patrolSchedule.title}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-sand-100/90">
              <Clock className="h-4 w-4" />
              {active.data.patrolAssignment.patrolSchedule.startTime} –{' '}
              {active.data.patrolAssignment.patrolSchedule.endTime}
            </p>
          </div>
          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-200" />
              {verified} verified
            </div>
            <Button variant="danger" onClick={() => setEndSheetOpen(true)}>
              <Square className="h-4 w-4" /> End Patrol
            </Button>
          </div>
        </div>
      ) : !admin && active.isLoading ? (
        <Spinner className="text-brand-600" />
      ) : null}

      {admin && active.data ? (
        <Card
          title="Active Session"
          icon={<MapPin className="h-4 w-4" />}
          actions={<Badge tone="success">ACTIVE</Badge>}
        >
          <p className="text-sm text-ink-600">
            <span className="font-semibold text-ink-900">
              {active.data.patrolAssignment.patrolSchedule.title}
            </span>{' '}
            · verified {verified} checkpoint(s)
          </p>
          <Button variant="danger" size="sm" className="mt-3" onClick={() => setEndSheetOpen(true)}>
            <Square className="h-4 w-4" /> End
          </Button>
        </Card>
      ) : null}

      <Card
        title={admin ? 'All Assignments' : 'My Assignments'}
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
            title="No assignments yet"
            description="You don't have any assigned patrols at the moment."
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
                        <div className="text-xs text-ink-400">{formatDate(a.patrolSchedule.scheduledDate)}</div>
                      </div>
                    </div>
                    <Badge tone={patrolStatusTone(a.status)} dot>
                      {a.status}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-sm text-ink-500">
                    <Clock className="h-4 w-4 text-ink-400" />
                    {a.patrolSchedule.startTime} – {a.patrolSchedule.endTime}
                  </div>

                  <div className="mt-2 text-xs text-ink-400">
                    {a.patrolSchedule.requiredCheckpoints.length} checkpoints ·{' '}
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
                        Start Patrol
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
        title="End patrol"
        footer={
          <Button
            variant="danger"
            fullWidth
            size="lg"
            disabled={endPatrol.isPending}
            onClick={() => active.data && endPatrol.mutate(active.data.id)}
          >
            {endPatrol.isPending ? <Spinner className="h-5 w-5" /> : <Square className="h-5 w-5" />}
            Confirm End
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-500">Add a summary of this patrol (optional).</p>
          <Textarea
            label="End notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Completed all checkpoints, no incidents encountered."
          />
        </div>
      </Sheet>
    </div>
  );
}
