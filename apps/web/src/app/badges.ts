import type {
  IncidentSeverity,
  IncidentStatus,
  PatrolStatus,
  ScanResult,
} from '@e-tanod/types';

export type Tone =
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
  | 'ink';

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
  MEDIUM: 'success',
  HIGH: 'warning',
  CRITICAL: 'danger',
};
export const incidentSeverityTone = (s?: IncidentSeverity): Tone => severityTones[s ?? 'LOW'];

export const scanTone: Record<ScanResult, Tone> = {
  VALID: 'success',
  DUPLICATE: 'warning',
  NOT_IN_PATROL: 'warning',
  INACTIVE: 'warning',
  LOCATION_UNAVAILABLE: 'warning',
  OUTSIDE_RADIUS: 'danger',
  INVALID: 'danger',
};
