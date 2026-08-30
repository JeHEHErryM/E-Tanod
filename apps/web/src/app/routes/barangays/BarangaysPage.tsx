import { useQuery } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/services/api';
import { Card, Badge } from '@e-tanod/ui';
import type { Barangay } from '@e-tanod/types';

export function BarangaysPage() {
  const { data, isLoading, error } = useQuery<Barangay[]>({
    queryKey: ['barangays'],
    queryFn: async () => (await api.get<Barangay[]>('/barangays')).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Barangays</h1>
        <p className="text-sm text-gray-500">Manage barangay records</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{getErrorMessage(error)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.map((b) => (
            <Card key={b.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{b.name}</h3>
                  <div className="mt-1 text-xs text-gray-500">{b.code}</div>
                </div>
                <Badge tone={b.isActive ? 'success' : 'danger'}>{b.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              {b.description ? <p className="mt-2 text-sm text-gray-600">{b.description}</p> : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
