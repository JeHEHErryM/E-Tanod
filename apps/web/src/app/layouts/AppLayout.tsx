import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { Badge } from '@e-tanod/ui';

const navItems: { to: string; label: string; roles: string[] }[] = [
  { to: '/', label: 'Dashboard', roles: [] },
  { to: '/users', label: 'Users', roles: ['SUPER_ADMIN', 'BARANGAY_ADMIN'] },
  { to: '/barangays', label: 'Barangays', roles: ['SUPER_ADMIN'] },
  { to: '/audit', label: 'Audit Logs', roles: ['SUPER_ADMIN', 'BARANGAY_ADMIN'] },
];

const roleTone: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  SUPER_ADMIN: 'danger',
  BARANGAY_ADMIN: 'warning',
  TANOD: 'info',
  RESIDENT: 'success',
};

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const visible = user ? navItems.filter((n) => n.roles.length === 0 || n.roles.includes(user.primaryRole)) : [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-base font-bold text-white">
            ET
          </span>
          <span className="text-lg font-bold text-brand-900">E-Tanod</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-5">
          <div className="text-sm text-gray-500">Barangay Security Management</div>
          <div className="flex items-center gap-3">
            {user?.primaryRole ? <Badge tone={roleTone[user.primaryRole] ?? 'default'}>{user.primaryRole}</Badge> : null}
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-800">{user?.fullName ?? user?.username}</div>
              <div className="text-xs text-gray-500">{user?.username}</div>
            </div>
            <button onClick={handleLogout} className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100">
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
