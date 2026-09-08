import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Search, UserPlus, User, Check, X, Settings2, MapPin } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { api, getErrorMessage } from '@/services/api';
import { Card, Button, Spinner, EmptyState, Sheet, Input, PasswordInput, Select } from '@e-tanod/ui';
import type { Barangay, PaginatedResult } from '@e-tanod/types';
import type { RoleName } from '@e-tanod/types';
import { roleMeta } from '@/app/roles';
import { StatusLabel } from '@/app/components/StatusLabel';
import { PageHeader } from '@/app/components/PageHeader';
import { formatDateTime } from '@/app/lib/format';

interface UserRow {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  primaryRole: RoleName;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  barangay?: { id: string; name: string; code: string } | null;
}

function useBarangays() {
  return useQuery<Barangay[]>({
    queryKey: ['barangays'],
    queryFn: async () => (await api.get<Barangay[]>('/barangays')).data,
  });
}

export function UsersPage() {
  const { t, i18n } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const canGrantSuperAdmin = me?.primaryRole === 'SUPER_ADMIN';
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [managing, setManaging] = useState<UserRow | null>(null);
  const queryClient = useQueryClient();

  const barangays = useBarangays();

  const activeUsers = useQuery<PaginatedResult<UserRow>>({
    queryKey: ['users', 'active', search],
    queryFn: async () => {
      const res = await api.get<PaginatedResult<UserRow>>('/users', {
        params: { search: search || undefined, isActive: true, page: 1, pageSize: 100 },
      });
      return res.data;
    },
  });

  const pendingUsers = useQuery<PaginatedResult<UserRow>>({
    queryKey: ['users', 'pending'],
    queryFn: async () => {
      const res = await api.get<PaginatedResult<UserRow>>('/users', {
        params: { isActive: false, page: 1, pageSize: 100 },
      });
      return res.data;
    },
  });

  const onChanged = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('users.title')}
        description={t('users.desc')}
        icon={<Users className="h-5 w-5" />}
        actions={
          canGrantSuperAdmin ? (
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4" /> {t('users.add')}
            </Button>
          ) : null
        }
      />

      <div className="relative max-w-md">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-400">
          <Search className="h-5 w-5" />
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('users.searchPlaceholder')}
          className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-300 focus:border-brand-500 focus:outline-none focus:ring-brand-100"
        />
      </div>

      {/* Pending approvals */}
      {pendingUsers.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-brand-600" />
        </div>
      ) : pendingUsers.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {getErrorMessage(pendingUsers.error)}
        </div>
      ) : (pendingUsers.data?.data ?? []).length > 0 ? (
        <Card
          title={t('users.pendingTitle')}
          subtitle={t('users.pendingDesc')}
          icon={<UserPlus className="h-4 w-4" />}
        >
          <ul className="divide-y divide-ink-100">
            {pendingUsers.data!.data.map((u) => {
              const meta = roleMeta(u.primaryRole);
              return (
                <li key={u.id} className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.tint}`}>
                      <meta.icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="truncate font-bold text-ink-900">{u.fullName}</span>
                        <span className="text-xs font-semibold text-ink-400">@{u.username}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-400">
                        <span className="font-semibold text-ink-500">{t(`role.${u.primaryRole}`)}</span>
                        {u.barangay ? (
                          <>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {u.barangay.name}
                            </span>
                          </>
                        ) : null}
                        <span>{t('users.requestedAt', { time: formatDateTime(u.createdAt, i18n.language) })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => {
                        const res = api.patch(`/users/${u.id}`, { isActive: true, isVerified: true }).then(() => onChanged());
                        res.catch(() => {});
                      }}
                    >
                      <Check className="h-4 w-4" /> {t('users.approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      onClick={() => {
                        const res = api.delete(`/users/${u.id}`).then(() => onChanged());
                        res.catch(() => {});
                      }}
                    >
                      <X className="h-4 w-4" /> {t('users.reject')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 border-t border-ink-100 pt-3 text-xs text-ink-400">{t('users.pendingHint')}</p>
        </Card>
      ) : null}

      {/* Accounts */}
      {activeUsers.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-brand-600" />
        </div>
      ) : activeUsers.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {getErrorMessage(activeUsers.error)}
        </div>
      ) : (activeUsers.data?.data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title={t('users.emptyTitle')}
            description={search ? t('users.emptySearch', { search }) : t('users.emptyAll')}
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeUsers.data!.data.map((u) => {
            const meta = roleMeta(u.primaryRole);
            return (
              <div
                key={u.id}
                className="flex items-start gap-3.5 rounded-2xl border border-ink-100 bg-white p-4 shadow-card transition-all hover:border-brand-200 hover:shadow-card-hover"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.tint}`}>
                  <meta.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-ink-900">{u.fullName}</div>
                  <div className="truncate text-xs text-ink-400">@{u.username}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-bold text-ink-500">{t(`role.${u.primaryRole}`)}</span>
                    <StatusLabel tone={u.isActive ? 'success' : 'danger'} label={u.isActive ? t('users.active') : t('users.inactive')} />
                  </div>
                  {u.barangay ? (
                    <div className="mt-1 flex items-center gap-1 text-xs text-ink-400">
                      <MapPin className="h-3 w-3" /> {u.barangay.name}
                    </div>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 shrink-0 px-0"
                  onClick={() => setManaging(u)}
                  aria-label={t('users.manage')}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <CreateUserSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        barangays={barangays.data ?? []}
        onCreated={onChanged}
      />

      <ManageUserSheet
        key={managing?.id ?? 'none'}
        user={managing}
        onClose={() => setManaging(null)}
        barangays={barangays.data ?? []}
        canGrantSuperAdmin={canGrantSuperAdmin}
        onChanged={onChanged}
      />
    </div>
  );
}

function CreateUserSheet({
  open,
  onClose,
  barangays,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  barangays: Barangay[];
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleName>('TANOD');
  const [barangayId, setBarangayId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/users', { username, password, fullName, primaryRole: role, roles: [role], barangayId: barangayId || undefined });
      setUsername('');
      setFullName('');
      setPassword('');
      setRole('TANOD');
      setBarangayId('');
      onClose();
      onCreated();
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
      title={t('users.createTitle')}
      footer={
        <Button fullWidth size="lg" onClick={submit} disabled={!username || !fullName || password.length < 8 || loading}>
          {loading ? <Spinner className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
          {t('users.create')}
        </Button>
      }
    >
      <div className="space-y-4">
        <Input label={t('users.fullName')} value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder={t('users.fullNamePlaceholder')} leading={<User className="h-5 w-5" />} />
        <Input label={t('users.username')} value={username} onChange={(e) => setUsername(e.target.value)} required placeholder={t('users.usernamePlaceholder')} leading={<Users className="h-5 w-5" />} />
        <PasswordInput label={t('users.tempPassword')} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder={t('users.passwordHint')} showLabel={t('login.showPassword')} hideLabel={t('login.hidePassword')} />
        <Select label={t('users.primaryRole')} value={role} onChange={(e) => setRole(e.target.value as RoleName)}>
          <option value="TANOD">{t('role.TANOD')}</option>
          <option value="BARANGAY_ADMIN">{t('role.BARANGAY_ADMIN')}</option>
          <option value="RESIDENT">{t('role.RESIDENT')}</option>
          <option value="SUPER_ADMIN">{t('role.SUPER_ADMIN')}</option>
        </Select>
        <Select label={t('users.barangayLabel')} value={barangayId} onChange={(e) => setBarangayId(e.target.value)}>
          <option value="">{t('users.noBarangay')}</option>
          {barangays.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">{error}</div>
        ) : null}
      </div>
    </Sheet>
  );
}

function ManageUserSheet({
  user,
  onClose,
  barangays,
  canGrantSuperAdmin,
  onChanged,
}: {
  user: UserRow | null;
  onClose: () => void;
  barangays: Barangay[];
  canGrantSuperAdmin: boolean;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [role, setRole] = useState<RoleName>(user?.primaryRole ?? 'RESIDENT');
  const [barangayId, setBarangayId] = useState(user?.barangay?.id ?? '');
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      await api.patch(`/users/${user.id}`, {
        primaryRole: role,
        roles: [role],
        barangayId: barangayId || undefined,
        isActive,
      });
      onClose();
      onChanged();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      open={!!user}
      onClose={onClose}
      title={t('users.manageTitle')}
      footer={
        <Button fullWidth size="lg" onClick={submit} disabled={loading}>
          {loading ? <Spinner className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          {t('users.save')}
        </Button>
      }
    >
      {user ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-sand-100 p-4">
            <div className="font-bold text-ink-900">{user.fullName}</div>
            <div className="text-xs text-ink-400">@{user.username}</div>
          </div>
          <Select label={t('users.primaryRole')} value={role} onChange={(e) => setRole(e.target.value as RoleName)}>
            <option value="TANOD">{t('role.TANOD')}</option>
            <option value="BARANGAY_ADMIN">{t('role.BARANGAY_ADMIN')}</option>
            <option value="RESIDENT">{t('role.RESIDENT')}</option>
            {canGrantSuperAdmin ? <option value="SUPER_ADMIN">{t('role.SUPER_ADMIN')}</option> : null}
          </Select>
          <Select label={t('users.barangayLabel')} value={barangayId} onChange={(e) => setBarangayId(e.target.value)}>
            <option value="">{t('users.noBarangay')}</option>
            {barangays.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <div className="flex items-center justify-between rounded-2xl border border-ink-200 p-4">
            <div>
              <div className="text-sm font-bold text-ink-900">{t('users.accountStatus')}</div>
              <div className="text-xs text-ink-500">{isActive ? t('users.active') : t('users.inactive')}</div>
            </div>
            <button
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((v) => !v)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${isActive ? 'bg-brand-600' : 'bg-ink-300'}`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-soft transition-all ${isActive ? 'left-6' : 'left-1'}`}
              />
            </button>
          </div>
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">{error}</div>
          ) : null}
        </div>
      ) : (
        <div className="py-8" />
      )}
    </Sheet>
  );
}