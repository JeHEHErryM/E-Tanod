import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, MapPin, QrCode, Users } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { getErrorMessage } from '@/services/api';
import { Button, Input, Spinner } from '@e-tanod/ui';
import { AppLogo } from '@/app/components/AppLogo';

const demoHints = [
  { role: 'Super Admin', user: 'superadmin', tint: 'bg-rose-500' },
  { role: 'Barangay Admin', user: 'barangayadmin', tint: 'bg-amber-500' },
  { role: 'Tanod', user: 'tanod1', tint: 'bg-sky-500' },
  { role: 'Resident', user: 'resident1', tint: 'bg-emerald-500' },
];

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-full bg-sand-50 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-800 via-brand-900 to-ink-950 p-12 text-sand-50 lg:flex lg:flex-col lg:justify-between">
        <AppLogo size={44} light />
        <div className="relative z-10 max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-brand-100 backdrop-blur">
            <MapPin className="h-3.5 w-3.5" />
            Mamburao, Occidental Mindoro
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight text-balance">
            Safer barangays, one patrol at a time.
          </h1>
          <p className="mt-4 text-brand-200/90">
            GIS-based patrol management, secure QR checkpoints, incident mapping, and resident
            reporting — all in one place.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { icon: ShieldCheck, label: 'Secure QR checkpoints', sub: 'Geofence-verified' },
              { icon: MapPin, label: 'Live incident map', sub: 'Real-time updates' },
              { icon: QrCode, label: 'Patrol tracking', sub: 'Accountable shifts' },
            { icon: Users, label: 'Resident reports', sub: 'Community alerts' },
          ].map((f) => (
              <div key={f.label} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-200" />
                <div>
                  <div className="text-sm font-semibold text-sand-50">{f.label}</div>
                  <div className="text-xs text-brand-200/80">{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs text-brand-300/70">
          © {new Date().getFullYear()} E-Tanod · Academic capstone / research system
        </p>
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="lg:hidden mb-4">
              <AppLogo size={56} />
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">Welcome back</h2>
            <p className="mt-1.5 text-sm text-ink-500">Sign in to continue to your console</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Enter your username"
              leading={<User className="h-5 w-5" />}
            />
            <Input
              label="Password"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              leading={<Lock className="h-5 w-5" />}
            />

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
                {error}
              </div>
            ) : null}

            <Button type="submit" disabled={loading} size="lg" fullWidth>
              {loading ? (
                <>
                  <Spinner className="h-5 w-5" /> Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-400">
              Demo accounts
              <span className="h-px flex-1 bg-ink-100" />            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoHints.map((d) => (
                <button
                  key={d.user}
                  type="button"
                  onClick={() => {
                    setUsername(d.user);
                    setError('');
                  }}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-sand-100"
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${d.tint}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-ink-700">{d.role}</span>
                    <span className="block truncate font-mono text-[11px] text-ink-400">{d.user}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 border-t border-ink-100 pt-2.5 text-center text-xs text-ink-400">
              Password for all: <span className="font-mono font-semibold text-ink-600">DemoPass123!</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
