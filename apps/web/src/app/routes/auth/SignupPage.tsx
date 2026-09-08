import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User,
  Lock,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Users,
  CheckCircle2,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/services/api';
import { Button, Input, PasswordInput, Select, Spinner } from '@e-tanod/ui';
import type { Barangay, RoleName } from '@e-tanod/types';
import { BrandWordmark } from '@/app/components/AppLogo';
import { LanguageToggle } from '@/i18n/LanguageToggle';

const ROLE_OPTIONS: { key: RoleName; icon: LucideIcon; titleKey: string; descKey: string }[] = [
  { key: 'RESIDENT', icon: Users, titleKey: 'signup.roleResidentTitle', descKey: 'signup.roleResidentDesc' },
  { key: 'TANOD', icon: ShieldCheck, titleKey: 'signup.roleTanodTitle', descKey: 'signup.roleTanodDesc' },
];

export function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<RoleName>('RESIDENT');
  const [barangayId, setBarangayId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const barangays = useQuery<Barangay[]>({
    queryKey: ['barangays'],
    queryFn: async () => (await api.get<Barangay[]>('/barangays')).data,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError(t('signup.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', {
        fullName,
        username,
        email,
        phone: phone || undefined,
        role,
        barangayId: barangayId || undefined,
        password,
      });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-full items-center justify-center bg-sand-50 px-5 py-10">
        <div className="w-full max-w-md">
          <header className="mb-8 flex items-center justify-between">
            <BrandWordmark size={36} />
            <LanguageToggle />
          </header>
          <div className="rounded-3xl border border-ink-100 bg-white p-8 text-center shadow-panel">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <h1 className="mt-5 font-display text-2xl font-black tracking-tight text-ink-900">
              {t('signup.doneTitle')}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{t('signup.doneDesc')}</p>
            <div className="mt-6 space-y-2.5">
              <Button fullWidth size="lg" onClick={() => navigate('/login')}>
                {t('login.submit')}
              </Button>
              <Button fullWidth size="lg" variant="outline" onClick={() => navigate('/landing')}>
                {t('signup.backLanding')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-sand-50 px-5 py-10">
      <div className="w-full max-w-md">
        <header className="mb-8 flex items-center justify-between">
          <Link to="/landing" className="transition-opacity hover:opacity-90" aria-label={t('login.backHome')}>
            <BrandWordmark size={36} />
          </Link>
          <LanguageToggle />
        </header>

        <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-panel sm:p-8">
          <div className="mb-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('login.backHome')}
            </Link>
            <h1 className="mt-3 font-display text-2xl font-black tracking-tight text-ink-900">
              {t('signup.title')}
            </h1>
            <p className="mt-1.5 text-sm text-ink-500">{t('signup.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('signup.fullName')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              placeholder={t('signup.fullNamePlaceholder')}
              leading={<User className="h-5 w-5" />}
            />
            <Input
              label={t('login.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              autoComplete="username"
              placeholder={t('login.usernamePlaceholder')}
              leading={<User className="h-5 w-5" />}
            />
            <Input
              label={t('signup.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              leading={<Mail className="h-5 w-5" />}
            />
            <Input
              label={t('signup.phone')}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="09xx-xxx-xxxx"
              leading={<Phone className="h-5 w-5" />}
            />

            <div>
              <span className="mb-1.5 block text-sm font-semibold text-ink-700">{t('signup.roleLabel')}</span>
              <div className="grid grid-cols-2 gap-2.5">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setRole(opt.key)}
                    aria-pressed={role === opt.key}
                    className={`rounded-2xl border p-3.5 text-left transition-colors ${
                      role === opt.key
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-ink-200 bg-white hover:border-brand-300'
                    }`}
                  >
                    <opt.icon className={`h-5 w-5 ${role === opt.key ? 'text-brand-700' : 'text-ink-400'}`} />
                    <span className="mt-1.5 block text-sm font-bold text-ink-900">{t(opt.titleKey)}</span>
                    <span className="block text-xs text-ink-500">{t(opt.descKey)}</span>
                  </button>
                ))}
              </div>
            </div>

            <Select label={t('signup.barangayLabel')} value={barangayId} onChange={(e) => setBarangayId(e.target.value)}>
              <option value="">{t('signup.barangayNone')}</option>
              {(barangays.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            {barangays.error ? (
              <p className="flex items-center gap-1.5 text-xs text-ink-400">
                <MapPin className="h-3.5 w-3.5" /> {t('signup.barangayError')}
              </p>
            ) : null}

            <PasswordInput
              label={t('login.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
              leading={<Lock className="h-5 w-5" />}
              showLabel={t('login.showPassword')}
              hideLabel={t('login.hidePassword')}
            />
            <PasswordInput
              label={t('signup.confirmPassword')}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
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

            <Button type="submit" size="lg" fullWidth disabled={loading}>
              {loading ? <Spinner className="h-5 w-5" /> : null}
              {t('signup.submit')}
            </Button>

            <p className="text-center text-xs leading-relaxed text-ink-400">{t('signup.approvalHint')}</p>
          </form>
        </div>
      </div>
    </div>
  );
}