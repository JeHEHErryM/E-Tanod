import type { ReactNode } from 'react';

interface StatProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: 'brand' | 'emerald' | 'amber' | 'rose' | 'sky' | 'ink';
  hint?: string;
}

const accents: Record<NonNullable<StatProps['accent']>, string> = {
  brand: 'bg-brand-100 text-brand-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  rose: 'bg-rose-100 text-rose-800',
  sky: 'bg-sky-100 text-sky-800',
  ink: 'bg-ink-100 text-ink-800',
};

export function Stat({ label, value, icon, accent = 'brand', hint }: StatProps) {
  return (
    <div className="surface flex items-center gap-4 p-4 transition-shadow hover:shadow-card-hover">
      {icon ? (
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accents[accent]}`}>
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <div className="truncate text-2xl font-extrabold leading-none tracking-tight text-ink-900">
          {value}
        </div>
        <div className="mt-1.5 text-xs font-medium text-ink-500">{label}</div>
        {hint ? <div className="mt-0.5 text-[11px] text-ink-400">{hint}</div> : null}
      </div>
    </div>
  );
}
