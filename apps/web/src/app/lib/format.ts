export function toSafeDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DASH = '—';

export function formatDate(value: unknown, locale = 'en'): string {
  const d = toSafeDate(value);
  if (!d) return DASH;
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(value: unknown, locale = 'en'): string {
  const d = toSafeDate(value);
  if (!d) return DASH;
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function formatTime(value: unknown, locale = 'en'): string {
  const d = toSafeDate(value);
  if (!d) return DASH;
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}