import { useQuery } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/services/api';
import { Card, Badge } from '@e-tanod/ui';

interface AuditEntry {
  id: string;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
  actor?: { id: string; username: string; fullName: string } | null;
}

export function AuditPage() {
  const { data, isLoading, error } = useQuery<{ data: AuditEntry[]; total: number }>({
    queryKey: ['audit'],
    queryFn: async () => (await api.get<{ data: AuditEntry[]; total: number }>('/audit')).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500">Append-only log of security-sensitive actions</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{getErrorMessage(error)}</div>
      ) : (
        <Card>
          <div className="divide-y divide-gray-100">
            {data?.data.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone="info">{entry.action}</Badge>
                    <span className="text-sm font-medium text-gray-800">{entry.actor?.username ?? 'system'}</span>
                  </div>
                  {entry.resourceType ? (
                    <div className="mt-1 text-xs text-gray-500">
                      {entry.resourceType}:{entry.resourceId ?? ''}
                    </div>
                  ) : null}
                </div>
                <div className="text-right text-xs text-gray-400">
                  <div>{new Date(entry.createdAt).toLocaleString()}</div>
                  {entry.ipAddress ? <div>{entry.ipAddress}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
