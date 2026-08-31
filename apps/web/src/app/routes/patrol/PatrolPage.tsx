import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { api, getErrorMessage } from '@/services/api';
import { Button, Badge, Card } from '@e-tanod/ui';
import type { PatrolStatus } from '@e-tanod/types';

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

const statusTone: Record<string, 'default' | 'success' | 'info' | 'warning' | 'danger'> = {
  ACTIVE: 'success',
  COMPLETED: 'info',
  INCOMPLETE: 'warning',
  SCHEDULED: 'default',
  CANCELLED: 'danger',
};

export function PatrolPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.primaryRole === 'SUPER_ADMIN' || user?.primaryRole === 'BARANGAY_ADMIN';
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');

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
      qc.invalidateQueries({ queryKey: ['active-session'] });
      qc.invalidateQueries({ queryKey: ['my-assignments'] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Patrol Management</h1>
        <p className="text-sm text-gray-500">
          {isAdmin ? 'Monitor patrol schedules and assignments' : 'Start and monitor your assigned patrols'}
        </p>
      </div>

      {!isAdmin && active.data ? (
        <Card title="Active Patrol Session">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-gray-900">
                  {active.data.patrolAssignment.patrolSchedule.title}
                </div>
                <div className="text-sm text-gray-500">
                  {active.data.patrolAssignment.patrolSchedule.scheduledDate} ·{' '}
                  {active.data.patrolAssignment.patrolSchedule.startTime}–
                  {active.data.patrolAssignment.patrolSchedule.endTime}
                </div>
              </div>
              <Badge tone="success">ACTIVE</Badge>
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-gray-500">Verified checkpoints</div>
              <div className="flex flex-wrap gap-2">
                {active.data.checkpointScans.length === 0 ? (
                  <span className="text-sm text-gray-400">No checkpoints verified yet</span>
                ) : (
                  active.data.checkpointScans.map((s) => (
                    <Badge key={s.scannedAt} tone={s.result === 'VALID' ? 'success' : 'warning'}>
                      {s.checkpoint.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-end gap-3 border-t border-gray-100 pt-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-500">End notes</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional summary"
                />
              </div>
              <Button variant="danger" onClick={() => endPatrol.mutate(active.data!.id)} disabled={endPatrol.isPending}>
                End Patrol
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card title={isAdmin ? 'All Assignments' : 'My Patrol Assignments'}>
        {assignments.isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : assignments.error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {getErrorMessage(assignments.error)}
          </div>
        ) : (assignments.data ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">No patrol assignments yet.</p>
        ) : (
          <div className="space-y-3">
            {assignments.data!.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
                <div>
                  <div className="font-medium text-gray-800">{a.patrolSchedule.title}</div>
                  <div className="text-sm text-gray-500">
                    {a.patrolSchedule.scheduledDate} · {a.patrolSchedule.startTime}–{a.patrolSchedule.endTime}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {a.patrolSchedule.requiredCheckpoints.length} checkpoints ·{' '}
                    {a.patrolSchedule.requiredCheckpoints.map((c) => c.checkpoint.name).join(', ')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={statusTone[a.status] ?? 'default'}>{a.status}</Badge>
                  {!isAdmin && a.status === 'SCHEDULED' && !active.data ? (
                    <Button size="sm" onClick={() => startPatrol.mutate(a.id)} disabled={startPatrol.isPending}>
                      Start Patrol
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
