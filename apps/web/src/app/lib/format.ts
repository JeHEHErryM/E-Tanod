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

/** Compact "time ago" label (e.g. "just now", "42s ago", "3m ago"). */
export function timeAgo(value: unknown, now = Date.now()): string | null {
  const d = toSafeDate(value);
  if (!d) return null;
  const seconds = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}