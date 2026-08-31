import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { api, getErrorMessage } from '@/services/api';
import { Button, Badge, Card } from '@e-tanod/ui';
import type { IncidentStatus, IncidentSeverity, PaginatedResult } from '@e-tanod/types';

interface IncidentCategory {
  id: string;
  name: string;
  code: string;
  severity: IncidentSeverity;
}

interface IncidentItem {
  id: string;
  code: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedAt: string;
  latitude: number | null;
  longitude: number | null;
  category: { id: string; name: string; code: string };
  barangay: { id: string; name: string } | null;
  createdBy: { id: string; fullName: string; username: string } | null;
}

const statusTone: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  VERIFIED: 'info',
  RESOLVED: 'success',
  REJECTED: 'danger',
};

const severityTone: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  LOW: 'default',
  MEDIUM: 'success',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

export function IncidentsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.primaryRole === 'SUPER_ADMIN' || user?.primaryRole === 'BARANGAY_ADMIN';
  const canReport = user?.primaryRole === 'TANOD' || user?.primaryRole === 'RESIDENT';
  const qc = useQueryClient();

  const categories = useQuery<IncidentCategory[]>({
    queryKey: ['incident-categories'],
    queryFn: async () => (await api.get<IncidentCategory[]>('/incidents/categories')).data,
  });

  const incidents = useQuery<PaginatedResult<IncidentItem>>({
    queryKey: ['incidents'],
    queryFn: async () => (await api.get<PaginatedResult<IncidentItem>>('/incidents', { params: { page: 1, pageSize: 50 } })).data,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
          <p className="text-sm text-gray-500">{isAdmin ? 'Review and manage reported incidents' : 'Report and track incidents'}</p>
        </div>
        {canReport ? <ReportIncidentButton categories={categories.data ?? []} onCreated={() => qc.invalidateQueries({ queryKey: ['incidents'] })} /> : null}
      </div>

      <Card title="Incident Reports">
        {incidents.isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : incidents.error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{getErrorMessage(incidents.error)}</div>
        ) : (incidents.data?.data ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">No incidents reported yet.</p>
        ) : (
          <div className="space-y-3">
            {incidents.data!.data.map((i) => (
              <div key={i.id} className="rounded-lg border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-gray-500">{i.code}</span>
                    <Badge tone={severityTone[i.severity] ?? 'default'}>{i.severity}</Badge>
                    <Badge tone={statusTone[i.status] ?? 'default'}>{i.status}</Badge>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(i.reportedAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-gray-700">{i.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span>{i.category.name}</span>
                  {i.barangay ? <span>· {i.barangay.name}</span> : null}
                  {i.createdBy ? <span>· reported by {i.createdBy.fullName}</span> : null}
                  {i.latitude != null && i.longitude != null ? (
                    <span>· {i.latitude.toFixed(5)}, {i.longitude.toFixed(5)}</span>
                  ) : null}
                </div>
                {isAdmin && i.status === 'PENDING' ? <IncidentActions incident={i} onDone={() => qc.invalidateQueries({ queryKey: ['incidents'] })} /> : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function IncidentActions({ incident, onDone }: { incident: IncidentItem; onDone: () => void }) {
  const [note, setNote] = useState('');
  const update = useMutation({
    mutationFn: (status: IncidentStatus) =>
      api.patch(`/incidents/${incident.id}/status`, { status, note: note || undefined }).then((r) => r.data),
    onSuccess: () => {
      setNote('');
      onDone();
    },
  });

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Resolution note (optional)"
        className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
      />
      <Button size="sm" variant="secondary" onClick={() => update.mutate('VERIFIED')} disabled={update.isPending}>
        Verify
      </Button>
      <Button size="sm" variant="primary" onClick={() => update.mutate('RESOLVED')} disabled={update.isPending}>
        Resolve
      </Button>
      <Button size="sm" variant="danger" onClick={() => update.mutate('REJECTED')} disabled={update.isPending}>
        Reject
      </Button>
    </div>
  );
}

function ReportIncidentButton({
  categories,
  onCreated,
}: {
  categories: IncidentCategory[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      let lat: number | undefined;
      let lng: number | undefined;
      if (coords.trim()) {
        const parts = coords.split(',').map((p) => parseFloat(p.trim()));
        if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
          lat = parts[0];
          lng = parts[1];
        } else {
          throw new Error('Coordinates must be "latitude, longitude"');
        }
      }
      return (await api.post('/incidents', { categoryId, description, latitude: lat, longitude: lng })).data;
    },
    onSuccess: () => {
      setOpen(false);
      setDescription('');
      setCoords('');
      setCategoryId('');
      onCreated();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  return (
    <div>
      <Button onClick={() => setOpen(!open)}>Report Incident</Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Report an Incident</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Coordinates <span className="font-normal text-gray-400">(optional, e.g. 14.5995, 120.9842)</span>
                </label>
                <input
                  value={coords}
                  onChange={(e) => setCoords(e.target.value)}
                  placeholder="latitude, longitude"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  Report
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
