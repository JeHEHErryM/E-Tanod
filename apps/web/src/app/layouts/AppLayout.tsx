import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldHalf,
  QrCode,
  Siren,
  Users,
  Building2,
  ScrollText,
  Menu,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { Badge, Button } from '@e-tanod/ui';
import type { RoleName } from '@e-tanod/types';
import { isAdmin, roleMeta } from '@/app/roles';
import { BrandWordmark } from '@/app/components/AppLogo';
import { useIsMobile } from '@/app/lib/useIsMobile';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: RoleName[] | 'all';
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: 'all', end: true },
  { to: '/patrol', label: 'Patrol', icon: ShieldHalf, roles: ['SUPER_ADMIN', 'BARANGAY_ADMIN', 'TANOD'] },
  { to: '/scan', label: 'Scan', icon: QrCode, roles: ['SUPER_ADMIN', 'BARANGAY_ADMIN', 'TANOD'] },
  { to: '/incidents', label: 'Incidents', icon: Siren, roles: 'all' },
  { to: '/users', label: 'Users', icon: Users, roles: ['SUPER_ADMIN', 'BARANGAY_ADMIN'] },
  { to: '/barangays', label: 'Barangays', icon: Building2, roles: ['SUPER_ADMIN'] },
  { to: '/audit', label: 'Audit Logs', icon: ScrollText, roles: ['SUPER_ADMIN', 'BARANGAY_ADMIN'] },
];

// Which items appear in the mobile bottom tab bar (field users)
const BOTTOM_TABS = ['/', '/patrol', '/scan', '/incidents'];

function visibleFor(user: RoleName | undefined, item: NavItem) {
  return item.roles === 'all' || (user ? item.roles.includes(user) : false);
}

function SidebarContent({ user, onNavigate }: { user?: RoleName; onNavigate?: () => void }) {
  const items = NAV_ITEMS.filter((i) => visibleFor(user, i));
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-ink-100/70 px-5">
        <BrandWordmark />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-800'
                  : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`h-[18px] w-[18px] ${isActive ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600'}`} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const admin = isAdmin(user?.primaryRole);
  const meta = roleMeta(user?.primaryRole);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Field users on mobile: bottom tab bar instead of drawer
  const useBottomTabs = isMobile && !admin;

  return (
    <div className="app-shell flex">
      {/* Desktop sidebar: all roles */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-ink-100 bg-white md:block">
        <SidebarContent user={user?.primaryRole} />
        <div className="border-t border-ink-100 p-3">
          <UserCard />
        </div>
      </aside>

      {/* Mobile drawer (admin only) */}
      {isMobile && admin ? (
        <div className="fixed inset-0 z-40 md:hidden">
          {drawerOpen ? (
            <div className="fixed inset-0 bg-ink-950/40" onClick={() => setDrawerOpen(false)} />
          ) : null}
          <aside
            className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[82vw] flex-col bg-white shadow-panel transition-transform duration-300 md:hidden ${
              drawerOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <SidebarContent user={user?.primaryRole} onNavigate={() => setDrawerOpen(false)} />
            <div className="border-t border-ink-100 p-3">
              <UserCard />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-ink-100 bg-sand-100/90 px-4 backdrop-blur-md md:px-6">
          <div className="flex items-center gap-3">
            {isMobile && admin ? (
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-600 transition-colors hover:bg-ink-100"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            ) : null}
            {isMobile ? (
              <span className="md:hidden">
                <BrandWordmark />
              </span>
            ) : (
              <span className="hidden text-sm font-medium text-ink-400 md:block">
                Barangay Security Management
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-bold leading-tight text-ink-900">
                {user?.fullName || user?.username}
              </div>
              <div className="text-xs text-ink-400">@{user?.username}</div>
            </div>
            <Badge tone={meta.tone} dot dotClass={undefined}>
              {meta.shortLabel}
            </Badge>
            <button
              onClick={handleLogout}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Main content */}
        <main
          className={`flex-1 ${useBottomTabs ? 'pb-24' : 'pb-10'} mx-auto w-full max-w-7xl px-4 pt-6 md:px-6 md:pt-8`}
        >
          <Outlet />
        </main>

        {/* Mobile bottom tab bar for field users */}
        {useBottomTabs ? (
          <nav
            className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 pb-safe backdrop-blur-md md:hidden"
            aria-label="Primary"
          >
            <div className="mx-auto flex h-16 max-w-md items-stretch">
              {NAV_ITEMS.filter((i) => visibleFor(user?.primaryRole, i) && BOTTOM_TABS.includes(i.to)).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                      isActive ? 'text-brand-700' : 'text-ink-400'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                          isActive ? 'bg-brand-50 text-brand-700' : ''
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                      </span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function UserCard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const meta = roleMeta(user?.primaryRole);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex items-center gap-3 rounded-xl bg-sand-50 p-2.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.tint}`}>
        <meta.icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-ink-900">
          {user?.fullName || user?.username}
        </div>
        <div className="truncate text-xs text-ink-400">@{user?.username}</div>
      </div>
      <Button variant="ghost" size="sm" className="h-9 px-2" onClick={handleLogout} aria-label="Log out">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
