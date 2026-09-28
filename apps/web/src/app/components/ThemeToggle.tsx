import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Theme = 'light' | 'dark';

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  const meta = document.getElementById('theme-color');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0c1516' : '#f6f4ef');
  try {
    localStorage.setItem('e-tanod:theme', theme);
  } catch {
    /* private mode */
  }
}

export function ThemeToggle({ light = false }: { light?: boolean }) {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );

  useEffect(() => {
    apply(theme);
  }, [theme]);

  const label = theme === 'dark' ? t('layout.themeLight') : t('layout.themeDark');

  return (
    <button
      onClick={() => setTheme((p) => (p === 'dark' ? 'light' : 'dark'))}
      title={label}
      aria-label={label}
      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
        light
          ? 'border-white/25 bg-white/10 text-white hover:bg-white/20'
          : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-700'
      }`}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}