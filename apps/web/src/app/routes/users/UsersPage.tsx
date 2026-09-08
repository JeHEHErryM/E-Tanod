import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Search, UserPlus, User } from 'lucide-react';
import { api, getErrorMessage } from '@/services/api';
import { Card, Badge, Button, Spinner, EmptyState, Sheet, Input, Select } from '@e-tanod/ui';
import type { UserSummary, PaginatedResult } from '@e-tanod/types';
import type { RoleName } from '@e-tanod/types';
import { roleMeta } from '@/app/roles';
import { PageHeader } from '@/app/components/PageHeader';

export function UsersPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<PaginatedResult<UserSummary>>({
    queryKey: ['users', search],
    queryFn: async () => {
      const res = await api.get<PaginatedResult<UserSummary>>('/users', {
        params: { search: search || undefined, page: 1, pageSize: 50 },
      });
      return res.data;
    },
  });

  const createUser = useMutation({
    mutationFn: async (input: {
      username: string;
      password: string;
      fullName: string;
      primaryRole: RoleName;
      roles: RoleName[];
    }) => {
      const res = await api.post('/users', input);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('users.title')}
        description={t('users.desc')}
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" /> {t('users.add')}
          </Button>
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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-brand-600" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {getErrorMessage(error)}
        </div>
      ) : (data?.data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title={t('users.emptyTitle')}
            description={search ? t('users.emptySearch', { search }) : t('users.emptyAll')}
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data!.data.map((u) => {
            const meta = roleMeta(u.primaryRole);
            return (
              <div
                key={u.id}
                className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-card transition-all hover:border-brand-200 hover:shadow-card-hover"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.tint}`}>
                  <meta.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-ink-900">{u.fullName}</div>
                  <div className="truncate text-xs text-ink-400">@{u.username}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge tone={meta.tone}>{t(`role.${u.primaryRole}`)}</Badge>
                  <Badge tone={u.isActive ? 'success' : 'danger'} dot>
                    {u.isActive ? t('users.active') : t('users.inactive')}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateUserSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(input) => {
          createUser.mutate(input);
          setCreateOpen(false);
        }}
      />
    </div>
  );
}

function CreateUserSheet({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { username: string; password: string; fullName: string; primaryRole: RoleName; roles: RoleName[] }) => void;
}) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleName>('TANOD');

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('users.createTitle')}
      footer={
        <Button
          fullWidth
          size="lg"
          type="submit"
          form="create-user"
          disabled={!username || !fullName || password.length < 8}
        >
          <UserPlus className="h-5 w-5" /> {t('users.create')}
        </Button>
      }
    >
      <form
        id="create-user"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate({ username, password, fullName, primaryRole: role, roles: [role] });
          setUsername('');
          setFullName('');
          setPassword('');
        }}
        className="space-y-4"
      >
        <Input label={t('users.fullName')} value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder={t('users.fullNamePlaceholder')} leading={<User className="h-5 w-5" />} />
        <Input label={t('users.username')} value={username} onChange={(e) => setUsername(e.target.value)} required placeholder={t('users.usernamePlaceholder')} leading={<Users className="h-5 w-5" />} />
        <Input label={t('users.tempPassword')} type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder={t('users.passwordHint')} />
        <Select label={t('users.primaryRole')} value={role} onChange={(e) => setRole(e.target.value as RoleName)}>
          <option value="TANOD">{t('role.TANOD')}</option>
          <option value="BARANGAY_ADMIN">{t('role.BARANGAY_ADMIN')}</option>
          <option value="RESIDENT">{t('role.RESIDENT')}</option>
          <option value="SUPER_ADMIN">{t('role.SUPER_ADMIN')}</option>
        </Select>
      </form>
    </Sheet>
  );
}
