import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { connectRealtime, disconnectRealtime } from '@/lib/realtime';

/**
 * Bridges server Socket.IO events to React Query cache invalidation. Mounted
 * once at the app root; polling queries remain as a fallback, but live events
 * refresh the relevant views immediately.
 */
export function useRealtime(): void {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectRealtime();
      return;
    }

    const socket = connectRealtime(token);
    const invalidate = (keys: string[][]) => {
      for (const key of keys) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    };

    const handlers: Record<string, () => void> = {
      'incident.created': () =>
        invalidate([['incidents'], ['dashboard'], ['gis-incidents'], ['gis-heat'], ['resident-reports']]),
      'incident.status': () =>
        invalidate([['incidents'], ['incidents-mine'], ['dashboard'], ['gis-incidents'], ['gis-heat']]),
      'incident.deleted': () =>
        invalidate([['incidents'], ['incidents-mine'], ['dashboard'], ['gis-incidents'], ['gis-heat']]),
      'patrol.assigned': () => invalidate([['my-assignments'], ['active-session']]),
      'patrol.deleted': () =>
        invalidate([['schedules'], ['my-assignments'], ['patrol-monitor'], ['dashboard']]),
      'patrol.started': () =>
        invalidate([['patrol-monitor'], ['my-assignments'], ['active-session'], ['dashboard']]),
      'patrol.ended': () =>
        invalidate([
          ['patrol-monitor'],
          ['my-assignments'],
          ['active-session'],
          ['dashboard'],
          ['patrol-compliance'],
        ]),
      'checkpoint.verified': () =>
        invalidate([['active-session'], ['patrol-monitor'], ['dashboard'], ['checkpoints']]),
      'checkpoint.qr.regenerated': () => invalidate([['checkpoints']]),
    };

    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event, handler);
    }

    return () => {
      for (const [event, handler] of Object.entries(handlers)) {
        socket.off(event, handler);
      }
    };
  }, [queryClient, token, isAuthenticated]);
}
