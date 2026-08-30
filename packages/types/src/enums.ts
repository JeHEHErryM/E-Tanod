export const ROLE_NAMES = ['SUPER_ADMIN', 'BARANGAY_ADMIN', 'TANOD', 'RESIDENT'] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

export const PATROL_STATUS = ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'INCOMPLETE', 'CANCELLED'] as const;
export type PatrolStatus = (typeof PATROL_STATUS)[number];

export const CHECKPOINT_STATUS = ['ACTIVE', 'INACTIVE'] as const;
export type CheckpointStatus = (typeof CHECKPOINT_STATUS)[number];

export const SCAN_RESULT = ['VALID', 'INVALID', 'DUPLICATE', 'NOT_IN_PATROL', 'INACTIVE', 'LOCATION_UNAVAILABLE', 'OUTSIDE_RADIUS'] as const;
export type ScanResult = (typeof SCAN_RESULT)[number];

export const INCIDENT_STATUS = ['PENDING', 'VERIFIED', 'RESOLVED', 'REJECTED'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUS)[number];

export const INCIDENT_SEVERITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITY)[number];

export const INCIDENT_SOURCE = ['TANOD', 'RESIDENT', 'ANONYMOUS', 'ADMIN'] as const;
export type IncidentSource = (typeof INCIDENT_SOURCE)[number];

export const SYNC_STATE = ['PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT'] as const;
export type SyncState = (typeof SYNC_STATE)[number];

export const NOTIFICATION_TYPE = [
  'PATROL_ASSIGNED',
  'SCHEDULE_CHANGE',
  'CHECKPOINT_STATUS',
  'NEW_INCIDENT',
  'EMERGENCY',
  'MISSED_CHECKPOINT',
  'PATROL_NOT_STARTED',
  'ADMIN_INSTRUCTION',
  'REPORT_SUBMITTED',
  'REPORT_STATUS',
  'VERIFIED_ALERT',
  'SYNC_ISSUE',
  'GENERAL',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPE)[number];

export const AUDIT_ACTION = [
  'LOGIN',
  'LOGOUT',
  'USER_CREATED',
  'ROLE_CHANGED',
  'PATROL_CREATED',
  'PATROL_STARTED',
  'PATROL_COMPLETED',
  'CHECKPOINT_CREATED',
  'QR_REGENERATED',
  'CHECKPOINT_VERIFIED',
  'INCIDENT_CREATED',
  'INCIDENT_UPDATED',
  'INCIDENT_VERIFIED',
  'ADMIN_ACTION',
] as const;
export type AuditAction = (typeof AUDIT_ACTION)[number];
