import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { setLang } from '@/i18n';

export function LanguageToggle({ light = false }: { light?: boolean }) {
  const { i18n } = useTranslation();
  const current = i18n.language === 'tl' ? 'tl' : 'en';

  const toggle = () => setLang(current === 'en' ? 'tl' : 'en');

  return (
    <button
      onClick={toggle}
      title={current === 'en' ? 'Switch to Tagalog' : 'Lumipat sa Ingles'}
      aria-label={current === 'en' ? 'Switch to Tagalog' : 'Lumipat sa Ingles'}
      className={`flex h-10 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold tracking-wide transition-colors ${
        light
          ? 'border-white/25 bg-white/10 text-sand-50 hover:bg-white/20'
          : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-700'
      }`}
    >
      <Languages className="h-4 w-4" />
      <span className="uppercase">{current}</span>
    </button>
  );
}