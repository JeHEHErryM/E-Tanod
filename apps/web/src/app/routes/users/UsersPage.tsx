import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, getErrorMessage } from '@/services/api';
import { Card, Badge, Button } from '@e-tanod/ui';
import type { UserSummary, PaginatedResult } from '@e-tanod/types';
import type { RoleName } from '@e-tanod/types';

const roleTone: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  SUPER_ADMIN: 'danger',
  BARANGAY_ADMIN: 'warning',
  TANOD: 'info',
  RESIDENT: 'success',
};

export function UsersPage() {
  const [search, setSearch] = useState('');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">Manage system users and roles</p>
        </div>
        <CreateUserButton onCreate={(input) => createUser.mutate(input)} />
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search users..."
        className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading users...</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{getErrorMessage(error)}</div>
      ) : (
        <Card>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                <th className="pb-2">Name</th>
                <th className="pb-2">Username</th>
                <th className="pb-2">Primary Role</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 font-medium text-gray-800">{u.fullName}</td>
                  <td className="py-2 text-gray-600">{u.username}</td>
                  <td className="py-2">
                    <Badge tone={roleTone[u.primaryRole] ?? 'default'}>{u.primaryRole}</Badge>
                  </td>
                  <td className="py-2">
                    <Badge tone={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function CreateUserButton({ onCreate }: { onCreate: (input: { username: string; password: string; fullName: string; primaryRole: RoleName; roles: RoleName[] }) => void }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleName>('TANOD');

  return (
    <div>
      <Button onClick={() => setOpen(!open)}>Create User</Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Create User</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onCreate({ username, password, fullName, primaryRole: role, roles: [role] });
                setOpen(false);
                setUsername('');
                setFullName('');
                setPassword('');
              }}
              className="space-y-3"
            >
              <Field label="Full Name" value={fullName} onChange={setFullName} required />
              <Field label="Username" value={username} onChange={setUsername} required />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Primary Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleName)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="TANOD">Tanod</option>
                  <option value="BARANGAY_ADMIN">Barangay Admin</option>
                  <option value="RESIDENT">Resident</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
