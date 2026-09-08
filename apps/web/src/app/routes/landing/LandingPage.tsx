import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  MapPin,
  QrCode,
  Users,
  Smartphone,
  Mail,
  ArrowDown,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { BrandWordmark } from '@/app/components/AppLogo';
import { LanguageToggle } from '@/i18n/LanguageToggle';

const CONTACT_EMAIL = 'hello@example.com';

const FEATURES: { key: string; icon: LucideIcon; tint: string }[] = [
  { key: 'checkpoints', icon: QrCode, tint: 'bg-brand-50 text-brand-700' },
  { key: 'map', icon: MapPin, tint: 'bg-rose-50 text-rose-600' },
  { key: 'patrol', icon: ShieldCheck, tint: 'bg-sky-50 text-sky-700' },
  { key: 'reports', icon: Users, tint: 'bg-emerald-50 text-emerald-700' },
];

const INSTALL_STEPS = ['installAndroid', 'installIos', 'installDesktop'] as const;

export function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-sand-50">
      <header className="sticky top-0 z-30 border-b border-ink-100/70 bg-sand-50/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 md:px-6">
          <BrandWordmark size={40} />
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button
              onClick={() => navigate('/signup')}
              className="hidden h-10 items-center justify-center rounded-xl px-3.5 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-50 sm:inline-flex"
            >
              {t('landing.ctaSignup')}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-bold text-sand-50 transition-colors hover:bg-brand-800"
            >
              {t('landing.ctaSignIn')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 md:px-6">
        <Hero onFeatures={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} />
        <Features />
        <InstallSection />
        <ContactSection />
      </main>

      <footer className="border-t border-ink-100/70 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 text-center md:px-6">
          <p className="text-sm font-semibold text-ink-600">{t('landing.footerTag')}</p>
          <p className="text-xs text-ink-400">{t('landing.demoHint')}</p>
        </div>
      </footer>
    </div>
  );
}

function Hero({ onFeatures }: { onFeatures: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-900 to-ink-950 px-6 py-16 text-sand-50 shadow-panel sm:px-10 sm:py-20">
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative z-10 max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t('landing.badge')}
        </span>
        <h1 className="mt-6 font-display text-3xl font-black leading-tight tracking-tight text-balance sm:text-5xl">
          {t('login.heroTitle')}
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-brand-100/90 sm:text-base">
          {t('landing.heroDesc')}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-sand-50 px-6 text-sm font-bold text-brand-900 transition-colors hover:bg-white"
          >
            {t('landing.ctaSignIn')}
          </button>
          <button
            onClick={onFeatures}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 text-sm font-bold text-sand-50 transition-colors hover:bg-white/20"
          >
            {t('landing.ctaFeatures')}
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const { t } = useTranslation();

  return (
    <section id="features" className="scroll-mt-20 py-16">
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl font-black tracking-tight text-ink-900 sm:text-3xl">
          {t('landing.featuresTitle')}
        </h2>
        <p className="mt-2 text-sm text-ink-500">{t('landing.featuresDesc')}</p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.key}
            className="rounded-3xl border border-ink-100 bg-white p-6 shadow-card transition-all hover:border-brand-200 hover:shadow-card-hover"
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${f.tint}`}>
              <f.icon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-display text-lg font-black text-ink-900">
              {t(`landing.feat.${f.key}.title`)}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
              {t(`landing.feat.${f.key}.desc`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function InstallSection() {
  const { t } = useTranslation();

  return (
    <section className="scroll-mt-20 pb-16">
      <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Smartphone className="h-6 w-6" />
          </span>
          <div className="max-w-2xl">
            <h2 className="font-display text-xl font-black tracking-tight text-ink-900 sm:text-2xl">
              {t('landing.installTitle')}
            </h2>
            <p className="mt-1.5 text-sm text-ink-500">{t('landing.installDesc')}</p>
          </div>
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {INSTALL_STEPS.map((step) => (
            <li
              key={step}
              className="flex items-start gap-2.5 rounded-2xl bg-sand-50 p-4 text-sm text-ink-600"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              {t(`landing.${step}`)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ContactSection() {
  const { t } = useTranslation();

  return (
    <section className="scroll-mt-20 pb-20">
      <div className="flex flex-col items-center rounded-3xl bg-brand-50 px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-sand-50">
          <Mail className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-display text-2xl font-black tracking-tight text-ink-900">
          {t('landing.contactTitle')}
        </h2>
        <p className="mt-2 max-w-md text-sm text-ink-600">{t('landing.contactDesc')}</p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-700 px-6 text-sm font-bold text-sand-50 transition-colors hover:bg-brand-800"
        >
          <Mail className="h-4 w-4" />
          {t('landing.contactCta')}
        </a>
      </div>
    </section>
  );
}