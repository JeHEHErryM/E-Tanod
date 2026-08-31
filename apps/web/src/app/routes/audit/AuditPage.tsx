import { useQuery } from '@tanstack/react-query';
import { ScrollText, Fingerprint, Globe } from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { Badge, Spinner, EmptyState } from '@e-tanod/ui';
import { PageHeader } from '@/app/components/PageHeader';

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

const actionTone = (action: string) =>
  action.startsWith('LOGIN') || action.startsWith('LOGOUT')
    ? 'info'
    : ['USER_CREATED', 'ROLE_CHANGED'].includes(action)
    ? 'brand'
    : action.includes('INCIDENT') && action.includes('CREATED')
    ? 'warning'
    : action.includes('DELETED')
    ? 'danger'
    : 'default';

export function AuditPage() {
  const { data, isLoading, error } = useQuery<{ data: AuditEntry[]; total: number }>({
    queryKey: ['audit'],
    queryFn: async () => (await api.get<{ data: AuditEntry[]; total: number }>('/audit')).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Append-only log of security-sensitive actions"
        icon={<ScrollText className="h-5 w-5" />}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-brand-600" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {getErrorMessage(error)}
        </div>
      ) : (data?.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Fingerprint className="h-8 w-8" />}
          title="No audit entries"
          description="Security-sensitive actions will be logged here."
        />
      ) : (
        <div className="surface p-5">
          <ol className="relative space-y-6 border-l border-ink-200 pl-6">
            {data?.data.map((entry) => {
              return (
                <li key={entry.id} className="relative">
                  <span className="absolute -left-[31px] flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-brand-400 shadow" />                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={actionTone(entry.action)}>{entry.action}</Badge>
                      {entry.actor ? (
                        <span className="text-sm font-semibold text-ink-800">
                          {entry.actor.fullName || entry.actor.username}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-ink-400">system</span>
                      )}
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-ink-400">
                      {entry.ipAddress ? (
                        <span className="inline-flex items-center gap-1">
                          <Globe className="h-3 w-3" /> {entry.ipAddress}
                        </span>
                      ) : null}
                      <span className="hidden sm:inline">·</span>
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {entry.resourceType ? (
                    <div className="mt-1 font-mono text-xs text-ink-400">
                      {entry.resourceType}
                      {entry.resourceId ? `:${entry.resourceId}` : ''}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
