import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  Plus,
  Settings2,
  MapPin,
  Users,
  ShieldHalf,
  Check,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { api, getErrorMessage } from '@/services/api';
import { Card, Button, Spinner, EmptyState, Sheet, Input, Select } from '@e-tanod/ui';
import type { Barangay, PaginatedResult } from '@e-tanod/types';
import { StatusLabel } from '@/app/components/StatusLabel';
import { PageHeader } from '@/app/components/PageHeader';
import { formatDate } from '@/app/lib/format';

interface ScheduleCheckpoint {
  id: string;
  order: number;
  checkpoint?: { id: string; name: string };
}

interface ScheduleAssignment {
  id: string;
  status: string;
  tanod?: { id: string; fullName: string; username: string };
}

interface ScheduleRow {
  id: string;
  title: string;
  description?: string | null;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  barangay?: { id: string; name: string } | null;
  requiredCheckpoints?: ScheduleCheckpoint[];
  assignments?: ScheduleAssignment[];
}

interface TanodRow {
  id: string;
  fullName: string;
  username: string;
}

interface CheckpointRow {
  id: string;
  name: string;
  code: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface FormState {
  title: string;
  description: string;
  barangayId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  tanodIds: string[];
  checkpointIds: string[];
}

function scheduleTone(status: 'ACTIVE' | 'COMPLETED' | 'PARTIAL' | 'SCHEDULED'): 'success' | 'info' | 'muted' | 'warning' {
  switch (status) {
    case 'ACTIVE':
      return 'info';
    case 'COMPLETED':
      return 'success';
    case 'PARTIAL':
      return 'warning';
    default:
      return 'muted';
  }
}

function summarize(status: 'ACTIVE' | 'COMPLETED' | 'PARTIAL' | 'SCHEDULED') {
  return { labelKey: `schedules.status${status}`, tone: scheduleTone(status) };
}

export function SchedulesPage() {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const isSuperAdmin = me?.primaryRole === 'SUPER_ADMIN';
  const ownBarangayId = me?.barangayId ?? '';
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ScheduleRow | null>(null);
  const queryClient = useQueryClient();

  const barangays = useQuery<Barangay[]>({
    queryKey: ['barangays'],
    queryFn: async () => (await api.get<Barangay[]>('/barangays')).data,
    enabled: isSuperAdmin,
  });

  const schedules = useQuery<PaginatedResult<ScheduleRow>>({
    queryKey: ['schedules'],
    queryFn: async () =>
      (await api.get<PaginatedResult<ScheduleRow>>('/patrol/schedules', { params: { page: 1, pageSize: 50 } })).data,
  });

  const onChanged = () => queryClient.invalidateQueries({ queryKey: ['schedules'] });

  const defaultBarangay = isSuperAdmin ? '' : ownBarangayId;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('schedules.title')}
        description={t('schedules.desc')}
        icon={<CalendarDays className="h-5 w-5" />}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> {t('schedules.add')}
          </Button>
        }
      />

      {schedules.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-brand-600" />
        </div>
      ) : schedules.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {getErrorMessage(schedules.error)}
        </div>
      ) : (schedules.data?.data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarDays className="h-8 w-8" />}
            title={t('schedules.emptyTitle')}
            description={t('schedules.emptyDesc')}
            actionLabel={t('schedules.add')}
            onAction={() => setCreating(true)}
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {schedules.data!.data.map((s) => {
            const assignments = s.assignments ?? [];
            const status: 'ACTIVE' | 'COMPLETED' | 'PARTIAL' | 'SCHEDULED' = assignments.some(
              (a) => a.status === 'ACTIVE',
            )
              ? 'ACTIVE'
              : assignments.length > 0 &&
                  assignments.every((a) => a.status === 'COMPLETED')
                ? 'COMPLETED'
                : assignments.length > 0
                  ? 'PARTIAL'
                  : 'SCHEDULED';
            const sSummary = summarize(status);
            return (
              <div
                key={s.id}
                className="flex flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-card transition-all hover:border-brand-200 hover:shadow-card-hover"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <ShieldHalf className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-bold text-ink-900">{s.title}</span>
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-ink-400">
                      {s.barangay?.name}
                    </div>
                  </div>
                  <StatusLabel tone={sSummary.tone} label={t(sSummary.labelKey)} />
                </div>

                <div className="space-y-1.5 text-xs text-ink-500">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-ink-400" />
                    <span>{formatDate(s.scheduledDate)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {s.startTime}–{s.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-ink-400" />
                    {t('schedules.checkpointsLabel', { count: s.requiredCheckpoints?.length ?? 0 })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-ink-400" />
                    {assignments.length > 0
                      ? assignments.map((a) => a.tanod?.fullName ?? '—').join(', ')
                      : t('schedules.noTanods')}
                  </div>
                </div>

                <div className="mt-auto flex gap-2 border-t border-ink-100 pt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(s)}>
                    <Settings2 className="h-4 w-4" /> {t('schedules.edit')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ScheduleSheet
        key={editing ? editing.id : creating ? 'create' : 'closed'}
        open={creating || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        schedule={editing}
        barangays={barangays.data ?? []}
        defaultBarangay={defaultBarangay}
        isSuperAdmin={isSuperAdmin}
        onSaved={onChanged}
      />
    </div>
  );
}

function ScheduleSheet({
  open,
  onClose,
  schedule,
  barangays,
  defaultBarangay,
  isSuperAdmin,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  schedule: ScheduleRow | null;
  barangays: Barangay[];
  defaultBarangay: string;
  isSuperAdmin: boolean;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const editing = !!schedule;
  const [form, setForm] = useState<FormState>(() => ({
    title: schedule?.title ?? '',
    description: schedule?.description ?? '',
    barangayId: schedule?.barangay?.id ?? defaultBarangay,
    scheduledDate: schedule?.scheduledDate ?? '',
    startTime: schedule?.startTime ?? '',
    endTime: schedule?.endTime ?? '',
    tanodIds: schedule?.assignments?.map((a) => a.tanod?.id ?? '').filter(Boolean) ?? [],
    checkpointIds: schedule?.requiredCheckpoints?.map((c) => c.checkpoint?.id ?? '').filter(Boolean) ?? [],
  }));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const barangayId = isSuperAdmin ? form.barangayId : defaultBarangay;

  const tanods = useQuery<PaginatedResult<TanodRow>>({
    queryKey: ['users', roleQueryKey, barangayId, 'schedules'],
    queryFn: async () =>
      (
        await api.get<PaginatedResult<TanodRow>>('/users', {
          params: { role: 'TANOD', barangayId: barangayId || undefined, isActive: true, page: 1, pageSize: 100 },
        })
      ).data,
    enabled: !!barangayId,
  });

  const checkpoints = useQuery<PaginatedResult<CheckpointRow>>({
    queryKey: ['checkpoints', barangayId, 'schedules'],
    queryFn: async () =>
      (
        await api.get<PaginatedResult<CheckpointRow>>('/checkpoints', {
          params: { barangayId: barangayId || undefined, status: 'ACTIVE', page: 1, pageSize: 100 },
        })
      ).data,
    enabled: !!barangayId,
  });

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const submit = async () => {
    setError('');
    if (!form.title.trim()) {
      setError(t('schedules.titleRequired'));
      return;
    }
    if (!barangayId) {
      setError(t('schedules.barangayRequired'));
      return;
    }
    if (form.checkpointIds.length === 0) {
      setError(t('schedules.checkpointsRequired'));
      return;
    }
    if (!form.scheduledDate || !form.startTime || !form.endTime) {
      setError(t('schedules.whenRequired'));
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        barangayId,
        scheduledDate: form.scheduledDate,
        startTime: form.startTime,
        endTime: form.endTime,
        tanodIds: form.tanodIds,
        checkpoints: form.checkpointIds.map((checkpointId, i) => ({ checkpointId, order: i + 1 })),
      };
      if (editing && schedule) {
        await api.patch(`/patrol/schedules/${schedule.id}`, payload);
      } else {
        await api.post('/patrol/schedules', payload);
      }
      onClose();
      onSaved();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? t('schedules.editTitle') : t('schedules.createTitle')}
      footer={
        <Button fullWidth size="lg" onClick={submit} disabled={loading}>
          {loading ? <Spinner className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          {editing ? t('schedules.save') : t('schedules.create')}
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          label={t('schedules.titleLabel')}
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          required
          placeholder={t('schedules.titlePlaceholder')}
        />
        <Input
          label={t('schedules.descriptionLabel')}
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder={t('schedules.descriptionPlaceholder')}
        />

        {isSuperAdmin ? (
          <Select
            label={t('schedules.barangayLabel')}
            value={form.barangayId}
            onChange={(e) => {
              set({ barangayId: e.target.value, tanodIds: [], checkpointIds: [] });
            }}
          >
            <option value="">{t('schedules.barangayNone')}</option>
            {barangays.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label={t('schedules.dateLabel')}
            type="date"
            value={form.scheduledDate}
            onChange={(e) => set({ scheduledDate: e.target.value })}
          />
          <Input
            label={t('schedules.startLabel')}
            type="time"
            value={form.startTime}
            onChange={(e) => set({ startTime: e.target.value })}
          />
          <Input
            label={t('schedules.endLabel')}
            type="time"
            value={form.endTime}
            onChange={(e) => set({ endTime: e.target.value })}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink-700">{t('schedules.tanodsLabel')}</span>
          {tanods.isLoading ? (
            <div className="flex items-center gap-2 rounded-xl bg-sand-50 px-3 py-2.5 text-xs text-ink-400">
              <Spinner className="h-4 w-4" /> {t('schedules.loadingTanods')}
            </div>
          ) : (tanods.data?.data ?? []).length === 0 ? (
            <p className="rounded-xl bg-sand-50 px-3 py-2.5 text-xs text-ink-400">{t('schedules.noTanodsAvailable')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tanods.data!.data.map((tRow) => (
                <button
                  key={tRow.id}
                  type="button"
                  onClick={() => set({ tanodIds: toggleId(form.tanodIds, tRow.id) })}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    form.tanodIds.includes(tRow.id)
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-ink-200 bg-white text-ink-500 hover:border-brand-300'
                  }`}
                >
                  {form.tanodIds.includes(tRow.id) ? <Check className="h-3.5 w-3.5" /> : null}
                  {tRow.fullName}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink-700">{t('schedules.checkpointsLabel', { count: form.checkpointIds.length })}</span>
          {checkpoints.isLoading ? (
            <div className="flex items-center gap-2 rounded-xl bg-sand-50 px-3 py-2.5 text-xs text-ink-400">
              <Spinner className="h-4 w-4" /> {t('schedules.loadingCheckpoints')}
            </div>
          ) : (checkpoints.data?.data ?? []).length === 0 ? (
            <p className="rounded-xl bg-sand-50 px-3 py-2.5 text-xs text-ink-400">{t('schedules.noCheckpointsAvailable')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {checkpoints.data!.data.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => set({ checkpointIds: toggleId(form.checkpointIds, c.id) })}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    form.checkpointIds.includes(c.id)
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-ink-200 bg-white text-ink-500 hover:border-brand-300'
                  }`}
                >
                  {form.checkpointIds.includes(c.id) ? <Check className="h-3.5 w-3.5" /> : null}
                  {c.name}
                </button>
              ))}
            </div>
          )}
          <p className="mt-1.5 text-xs text-ink-400">{t('schedules.checkpointsHint')}</p>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">{error}</div>
        ) : null}
      </div>
    </Sheet>
  );
}

const roleQueryKey = 'tanod';