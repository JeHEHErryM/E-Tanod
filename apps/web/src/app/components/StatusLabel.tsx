import type {
  IncidentSeverity,
  IncidentStatus,
  PatrolStatus,
} from '@e-tanod/types';

export type Tone =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'brand'
  | 'muted';

const dotColors: Record<Tone, string> = {
  default: 'bg-ink-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  brand: 'bg-brand-500',
  muted: 'bg-ink-300',
};

const labelColors: Record<Tone, string> = {
  default: 'text-ink-500',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-rose-700',
  info: 'text-sky-700',
  brand: 'text-brand-700',
  muted: 'text-ink-400',
};

export function StatusLabel({
  tone = 'default',
  label,
}: {
  tone?: Tone;
  label: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${labelColors[tone]}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotColors[tone]}`} />
      {label}
    </span>
  );
}

const patrolTones: Record<PatrolStatus, Tone> = {
  ACTIVE: 'success',
  COMPLETED: 'info',
  INCOMPLETE: 'warning',
  SCHEDULED: 'default',
  CANCELLED: 'danger',
};
export const patrolStatusTone = (s?: PatrolStatus): Tone => patrolTones[s ?? 'SCHEDULED'];

const statusTones: Record<IncidentStatus, Tone> = {
  PENDING: 'warning',
  VERIFIED: 'info',
  RESOLVED: 'success',
  REJECTED: 'danger',
};
export const incidentStatusTone = (s?: IncidentStatus): Tone => statusTones[s ?? 'PENDING'];

const severityTones: Record<IncidentSeverity, Tone> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
};
export const incidentSeverityTone = (s?: IncidentSeverity): Tone => severityTones[s ?? 'LOW'];