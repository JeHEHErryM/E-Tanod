import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Plus,
  QrCode,
  Settings2,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Users,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '@/stores/auth';
import { api, getErrorMessage } from '@/services/api';
import { Card, Button, Spinner, EmptyState, Sheet, Input, Select } from '@e-tanod/ui';
import type { Barangay, PaginatedResult } from '@e-tanod/types';
import { StatusLabel } from '@/app/components/StatusLabel';
import { PageHeader } from '@/app/components/PageHeader';

interface CheckpointRow {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  status: 'ACTIVE' | 'INACTIVE';
  barangay: { id: string; name: string };
}

interface QrToken {
  token: string;
  validUntil?: string | null;
}

interface CheckpointFormState {
  code: string;
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  barangayId: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const EMPTY_FORM: CheckpointFormState = {
  code: '',
  name: '',
  description: '',
  latitude: '',
  longitude: '',
  radiusMeters: 50,
  barangayId: '',
  status: 'ACTIVE',
};

export function CheckpointsPage() {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const isSuperAdmin = me?.primaryRole === 'SUPER_ADMIN';
  const ownBarangayId = me?.barangayId ?? '';
  const [barangayFilter, setBarangayFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<CheckpointRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrs, setQrs] = useState<Record<string, QrToken>>({});
  const queryClient = useQueryClient();

  const barangays = useQuery<Barangay[]>({
    queryKey: ['barangays'],
    queryFn: async () => (await api.get<Barangay[]>('/barangays')).data,
  });

  const checkpoints = useQuery<PaginatedResult<CheckpointRow>>({
    queryKey: ['checkpoints', barangayFilter, statusFilter],
    queryFn: async () => {
      const res = await api.get<PaginatedResult<CheckpointRow>>('/checkpoints', {
        params: {
          page: 1,
          pageSize: 100,
          barangayId: barangayFilter || undefined,
          status: statusFilter || undefined,
        },
      });
      return res.data;
    },
  });

  const onChanged = () => {
    queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
  };

  const loadQr = async (id: string) => {
    try {
      const res = await api.get<QrToken>(`/checkpoints/${id}/qr`);
      setQrs((m) => ({ ...m, [id]: res.data }));
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  const openEdit = (c: CheckpointRow) => {
    setEditing(c);
    void loadQr(c.id);
  };

  const copyToken = async (id: string, token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const regenerateQr = async (id: string) => {
    try {
      await api.post(`/checkpoints/${id}/qr/regenerate`, {});
      setQrs((m) => {
        const next = { ...m };
        delete next[id];
        return next;
      });
      await loadQr(id);
      onChanged();
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t('checkpoints.deleteConfirm'))) return;
    try {
      await api.delete(`/checkpoints/${id}`);
      onChanged();
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  const createSheetOpen = creating;
  const defaultBarangay = isSuperAdmin ? '' : ownBarangayId;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('checkpoints.title')}
        description={t('checkpoints.desc')}
        icon={<MapPin className="h-5 w-5" />}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> {t('checkpoints.add')}
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-xs flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-400">
            <MapPin className="h-5 w-5" />
          </span>
          <input
            value={barangayFilter}
            onChange={(e) => setBarangayFilter(e.target.value)}
            placeholder={t('checkpoints.searchPlaceholder')}
            className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-300 focus:border-brand-500 focus:outline-none focus:ring-brand-100"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 w-full sm:w-48">
          <option value="">{t('checkpoints.allStatus')}</option>
          <option value="ACTIVE">{t('checkpoints.statusActive')}</option>
          <option value="INACTIVE">{t('checkpoints.statusInactive')}</option>
        </Select>
      </div>

      {checkpoints.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-brand-600" />
        </div>
      ) : checkpoints.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {getErrorMessage(checkpoints.error)}
        </div>
      ) : (checkpoints.data?.data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            icon={<QrCode className="h-8 w-8" />}
            title={t('checkpoints.emptyTitle')}
            description={t('checkpoints.emptyDesc')}
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {checkpoints.data!.data.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-card transition-all hover:border-brand-200 hover:shadow-card-hover"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold text-ink-900">{c.name}</span>
                    <StatusLabel tone={c.status === 'ACTIVE' ? 'success' : 'muted'} label={c.status === 'ACTIVE' ? t('checkpoints.statusActive') : t('checkpoints.statusInactive')} />
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-ink-400">{c.code}</div>
                </div>
                {qrs[c.id] ? (
                  <div className="shrink-0 rounded-xl border border-ink-100 bg-white p-1.5" style={{ backgroundColor: '#ffffff' }}>
                    <QRCodeSVG value={qrs[c.id].token} size={72} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void loadQr(c.id)}
                    className="flex h-[88px] w-[88px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-300 text-ink-400 transition-colors hover:border-brand-400 hover:text-brand-600"
                    title={t('checkpoints.showQr')}
                  >
                    <QrCode className="h-5 w-5" />
                    <span className="text-[10px] font-bold">{t('checkpoints.showQr')}</span>
                  </button>
                )}
              </div>

              <div className="space-y-1 text-xs text-ink-500">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-ink-400" />
                  {t('checkpoints.coords', { lat: c.latitude.toFixed(5), lng: c.longitude.toFixed(5) })}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-ink-400" />
                  {t('checkpoints.barangayValue', { name: c.barangay?.name ?? '—' })}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3.5 w-3.5 rounded-full border border-ink-200 text-center text-[9px] leading-[13px]">R</span>
                  {t('checkpoints.radius', { meters: c.radiusMeters })}
                </div>
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(c)}>
                  <Settings2 className="h-4 w-4" /> {t('checkpoints.edit')}
                </Button>
                {qrs[c.id] ? (
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => copyToken(c.id, qrs[c.id].token)}>
                    {copiedId === c.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedId === c.id ? t('checkpoints.copied') : t('checkpoints.copyQr')}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 px-0"
                  onClick={() => regenerateQr(c.id)}
                  aria-label={t('checkpoints.regenerate')}
                  title={t('checkpoints.regenerate')}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 px-0 text-rose-600 hover:bg-rose-50"
                  onClick={() => remove(c.id)}
                  aria-label={t('checkpoints.delete')}
                  title={t('checkpoints.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CheckpointSheet
        key={editing ? editing.id : createSheetOpen ? 'create' : 'closed'}
        open={createSheetOpen || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        checkpoint={editing}
        qrToken={editing ? (qrs[editing.id] ?? null) : null}
        barangays={barangays.data ?? []}
        defaultBarangay={defaultBarangay}
        isSuperAdmin={isSuperAdmin}
        onSaved={onChanged}
      />
    </div>
  );
}

function CheckpointSheet({
  open,
  onClose,
  checkpoint,
  qrToken,
  barangays,
  defaultBarangay,
  isSuperAdmin,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  checkpoint: CheckpointRow | null;
  qrToken: QrToken | null;
  barangays: Barangay[];
  defaultBarangay: string;
  isSuperAdmin: boolean;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const editing = !!checkpoint;
  const [form, setForm] = useState<CheckpointFormState>(() =>
    checkpoint
      ? {
          code: checkpoint.code,
          name: checkpoint.name,
          description: checkpoint.description ?? '',
          latitude: String(checkpoint.latitude),
          longitude: String(checkpoint.longitude),
          radiusMeters: checkpoint.radiusMeters,
          barangayId: checkpoint.barangay?.id ?? defaultBarangay,
          status: checkpoint.status,
        }
      : { ...EMPTY_FORM, barangayId: defaultBarangay },
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError(t('checkpoints.coordsError'));
      return;
    }
    if (!form.barangayId) {
      setError(t('checkpoints.barangayRequired'));
      return;
    }
    setLoading(true);
    try {
      const payload = {
        code: form.code,
        name: form.name,
        description: form.description || undefined,
        latitude: lat,
        longitude: lng,
        radiusMeters: form.radiusMeters,
        ...(editing ? { status: form.status } : { barangayId: form.barangayId }),
      };
      if (editing && checkpoint) {
        await api.patch(`/checkpoints/${checkpoint.id}`, payload);
      } else {
        await api.post('/checkpoints', payload);
      }
      onClose();
      onSaved();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const set = (patch: Partial<CheckpointFormState>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? t('checkpoints.editTitle') : t('checkpoints.createTitle')}
      footer={
        <Button fullWidth size="lg" onClick={submit} disabled={!form.code || !form.name || loading}>
          {loading ? <Spinner className="h-5 w-5" /> : <Check className="h-4 w-4" />}
          {editing ? t('checkpoints.save') : t('checkpoints.create')}
        </Button>
      }
    >
      <div className="space-y-4">
        {qrToken ? (
          <div className="flex items-center gap-4 rounded-2xl bg-sand-100 p-4">
            <div className="rounded-xl border border-ink-100 bg-white p-2" style={{ backgroundColor: '#ffffff' }}>
              <QRCodeSVG value={qrToken.token} size={96} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink-900">{t('checkpoints.qrLabel')}</div>
              <p className="text-xs text-ink-500">{t('checkpoints.qrHint')}</p>
              <code className="mt-1 block truncate rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-ink-600">
                {qrToken.token}
              </code>
            </div>
          </div>
        ) : null}

        <Input label={t('checkpoints.code')} value={form.code} onChange={(e) => set({ code: e.target.value })} required placeholder="CP-004" />
        <Input label={t('checkpoints.name')} value={form.name} onChange={(e) => set({ name: e.target.value })} required placeholder={t('checkpoints.namePlaceholder')} />
        <Input label={t('checkpoints.description')} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder={t('checkpoints.descriptionPlaceholder')} />

        <div className="grid grid-cols-2 gap-3">
          <Input label={t('checkpoints.latitude')} type="number" step="any" value={form.latitude} onChange={(e) => set({ latitude: e.target.value })} placeholder="13.2233" />
          <Input label={t('checkpoints.longitude')} type="number" step="any" value={form.longitude} onChange={(e) => set({ longitude: e.target.value })} placeholder="120.5960" />
        </div>

        <Input
          label={t('checkpoints.radiusMeters')}
          type="number"
          min={10}
          max={500}
          value={form.radiusMeters}
          onChange={(e) => set({ radiusMeters: parseInt(e.target.value, 10) || 10 })}
          hint={t('checkpoints.radiusHint')}
        />

        <Select label={t('checkpoints.barangay')} value={form.barangayId} onChange={(e) => set({ barangayId: e.target.value })} disabled={!isSuperAdmin && !!defaultBarangay}>
          <option value="">{t('checkpoints.barangayNone')}</option>
          {barangays.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>

        {editing ? (
          <Select label={t('checkpoints.status')} value={form.status} onChange={(e) => set({ status: e.target.value as 'ACTIVE' | 'INACTIVE' })}>
            <option value="ACTIVE">{t('checkpoints.statusActive')}</option>
            <option value="INACTIVE">{t('checkpoints.statusInactive')}</option>
          </Select>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">{error}</div>
        ) : null}
      </div>
    </Sheet>
  );
}