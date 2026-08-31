import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin } from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { Badge, Spinner, EmptyState } from '@e-tanod/ui';
import type { Barangay } from '@e-tanod/types';
import { PageHeader } from '@/app/components/PageHeader';

export function BarangaysPage() {
  const { data, isLoading, error } = useQuery<Barangay[]>({
    queryKey: ['barangays'],
    queryFn: async () => (await api.get<Barangay[]>('/barangays')).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Barangays"
        description="Manage barangay records"
        icon={<Building2 className="h-5 w-5" />}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-brand-600" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {getErrorMessage(error)}
        </div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="No barangays"
          description="No barangay records exist yet."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card transition-all hover:shadow-card-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Building2 className="h-6 w-6" />
                </span>
                <Badge tone={b.isActive ? 'success' : 'danger'} dot>
                  {b.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{b.name}</h3>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-ink-400">
                <MapPin className="h-3.5 w-3.5" />
                {b.code}
              </div>
              {b.description ? <p className="mt-3 text-sm leading-relaxed text-ink-600">{b.description}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
