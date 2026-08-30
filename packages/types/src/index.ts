import type { RoleName, PatrolStatus, ScanResult, IncidentStatus, IncidentSeverity, IncidentSource, CheckpointStatus, SyncState } from './enums';

export * from './enums';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface UserSummary {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  primaryRole: RoleName;
  barangayId?: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
}

export interface AuthUser extends UserSummary {
  roles: RoleName[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface Barangay {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
}

export interface Checkpoint {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  status: CheckpointStatus;
  barangayId: string;
}

export interface PatrolAssignment {
  id: string;
  scheduleDate: string;
  status: PatrolStatus;
  scheduledStart: string;
  scheduledEnd: string;
  tanodId: string;
  checkpoints: string[];
}

export interface PatrolSession {
  id: string;
  patrolAssignmentId: string;
  startedAt: string;
  endedAt?: string | null;
  status: PatrolStatus;
}

export interface CheckpointScan {
  id: string;
  checkpointId: string;
  patrolSessionId: string;
  tanodId: string;
  scannedAt: string;
  latitude?: number | null;
  longitude?: number | null;
  distanceMeters?: number | null;
  accuracy?: number | null;
  result: ScanResult;
}

export interface IncidentCategory {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
}

export interface Incident {
  id: string;
  code: string;
  categoryId: string;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  barangayId?: string | null;
  severity: IncidentSeverity;
  source: IncidentSource;
  status: IncidentStatus;
  reportedAt: string;
  isAnonymous: boolean;
  reporterName?: string | null;
}

export interface IncidentDetail extends Incident {
  attachments: IncidentAttachment[];
  statusHistory: IncidentStatusHistory[];
}

export interface IncidentAttachment {
  id: string;
  incidentId: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface IncidentStatusHistory {
  id: string;
  incidentId: string;
  status: IncidentStatus;
  note?: string | null;
  changedByUserId?: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface SyncStatus {
  online: boolean;
  pendingCount: number;
  state: SyncState;
  lastSyncedAt?: string | null;
}

export interface DashboardStats {
  activePatrols: number;
  completedPatrols: number;
  todayIncidents: number;
  openReports: number;
  missedCheckpoints: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
