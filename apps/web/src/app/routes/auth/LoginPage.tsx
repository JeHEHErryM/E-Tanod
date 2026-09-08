import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Lock, User, MapPin, QrCode, Users, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { getErrorMessage } from '@/services/api';
import { Button, Input, PasswordInput, Spinner } from '@e-tanod/ui';
import { AppLogo } from '@/app/components/AppLogo';
import type { RoleName } from '@e-tanod/types';
import { LanguageToggle } from '@/i18n/LanguageToggle';

const demoHints: { roleKey: RoleName; user: string; tint: string }[] = [
  { roleKey: 'BARANGAY_ADMIN', user: 'barangayadmin', tint: 'bg-amber-500' },
  { roleKey: 'TANOD', user: 'tanod1', tint: 'bg-sky-500' },
  { roleKey: 'RESIDENT', user: 'resident1', tint: 'bg-emerald-500' },
];

export function LoginPage() {
  const { t } = useTranslation();
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
        <div className="relative z-10 flex items-start gap-8">
          <Link to="/landing" aria-label={t('login.backHome')} className="shrink-0 transition-opacity hover:opacity-90">
            <AppLogo size={128} light />
          </Link>
          <div className="min-w-0 max-w-lg">
            <h1 className="font-display text-4xl font-black leading-tight tracking-tight text-balance">
              {t('login.heroTitle')}
            </h1>
            <p className="mt-4 text-brand-200/90">
              {t('login.heroSubtitle')}
            </p>
          </div>
        </div>
        <div className="relative z-10 mt-12 grid grid-cols-2 gap-4">
          {[
            { icon: ShieldCheck, labelKey: 'login.feat.checkpoints' },
            { icon: MapPin, labelKey: 'login.feat.map' },
            { icon: QrCode, labelKey: 'login.feat.tracking' },
            { icon: Users, labelKey: 'login.feat.reports' },
          ].map((f) => (
            <div key={f.labelKey} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-200" />
              <div>
                <div className="text-sm font-semibold text-sand-50">{t(`${f.labelKey}.label`)}</div>
                <div className="text-xs text-brand-200/80">{t(`${f.labelKey}.sub`)}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="relative z-10 text-xs text-brand-300/70">
          {t('login.footer', { year: new Date().getFullYear() })}
        </p>
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex justify-center">
            <Link
              to="/landing"
              aria-label={t('login.backHome')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('login.backHome')}
            </Link>
          </div>
          <div className="mb-8 flex flex-col items-center text-center">
            <Link to="/landing" aria-label={t('login.backHome')} className="lg:hidden mb-4 block transition-opacity hover:opacity-90">
              <AppLogo size={56} />
            </Link>
            <h2 className="font-display text-2xl font-black tracking-tight text-ink-900">{t('login.welcome')}</h2>
            <p className="mt-1.5 text-sm text-ink-500">{t('login.subtitle')}</p>
            <div className="mt-4 flex items-center gap-2 lg:hidden">
              <LanguageToggle />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('login.username')}
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder={t('login.usernamePlaceholder')}
              leading={<User className="h-5 w-5" />}
            />
            <PasswordInput
              label={t('login.password')}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              leading={<Lock className="h-5 w-5" />}
              showLabel={t('login.showPassword')}
              hideLabel={t('login.hidePassword')}
            />

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
                {error}
              </div>
            ) : null}

            <Button type="submit" disabled={loading} size="lg" fullWidth>
              {loading ? (
                <>
                  <Spinner className="h-5 w-5" /> {t('login.submitting')}
                </>
              ) : (
                t('login.submit')
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            {t('login.noAccount')}{' '}
            <Link to="/signup" className="font-bold text-brand-700 underline-offset-4 transition-colors hover:text-brand-800 hover:underline">
              {t('login.signupCta')}
            </Link>
          </p>

          <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-400">
              {t('login.demoTitle')}
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
                    <span className="block truncate text-xs font-semibold text-ink-700">{t(`role.${d.roleKey}`)}</span>
                    <span className="block truncate font-mono text-[11px] text-ink-400">{d.user}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 border-t border-ink-100 pt-2.5 text-center text-xs text-ink-400">
              {t('login.demoPassword')} <span className="font-mono font-semibold text-ink-600">DemoPass123!</span>
            </p>
          </div>
        </div>

        <div className="absolute right-4 top-4 hidden lg:block">
          <LanguageToggle />
        </div>
      </div>
    </div>
  );
}
