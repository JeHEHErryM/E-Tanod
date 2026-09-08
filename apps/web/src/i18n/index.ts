import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import tl from './locales/tl.json';

const STORAGE_KEY = 'e-tanod-lang';

export function detectLang(): string {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'tl') return stored;
  const nav = navigator.language?.toLowerCase() ?? '';
  if (nav.startsWith('tl') || nav.startsWith('fil')) return 'tl';
  return 'en';
}

export function setLang(lang: 'en' | 'tl') {
  window.localStorage.setItem(STORAGE_KEY, lang);
  void i18n.changeLanguage(lang);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tl: { translation: tl },
  },
  lng: detectLang(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

export default i18n;