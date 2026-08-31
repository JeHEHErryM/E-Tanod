import type { ReactNode } from 'react';

type Tone =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'brand'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'sky'
  | 'ink'
  | 'muted';

const toneClasses: Record<Tone, string> = {
  default: 'bg-ink-100 text-ink-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-rose-50 text-rose-700',
  info: 'bg-sky-50 text-sky-700',
  brand: 'bg-brand-50 text-brand-800',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-800',
  rose: 'bg-rose-50 text-rose-700',
  sky: 'bg-sky-50 text-sky-700',
  ink: 'bg-ink-100 text-ink-700',
  muted: 'bg-sand-100 text-ink-500',
};

interface BadgeProps {
  tone?: Tone;
  dot?: boolean;
  dotClass?: string;
  children: ReactNode;
}

export function Badge({ tone = 'default', dot = false, dotClass, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${dotClass ?? 'bg-current opacity-70'}`} /> : null}
      {children}
    </span>
  );
}
