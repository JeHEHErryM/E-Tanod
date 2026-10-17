import { Role } from '@prisma/client';

export type Permission =
  | 'users.read'
  | 'users.create'
  | 'users.update'
  | 'users.delete'
  | 'barangay.manage'
  | 'barangay.read'
  | 'patrol.manage'
  | 'patrol.assign'
  | 'patrol.start'
  | 'patrol.end'
  | 'patrol.monitor'
  | 'checkpoint.manage'
  | 'checkpoint.scan'
  | 'checkpoint.read'
  | 'incident.review'
  | 'incident.report'
  | 'incident.read'
  | 'gis.view'
  | 'reports.view'
  | 'resident.report'
  | 'resident.track'
  | 'resident.manage'
  | 'sync.write'
  | 'sync.read'
  | 'audit.view'
  | 'system.config';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'users.read',
    'users.create',
    'users.update',
    'users.delete',
    'barangay.manage',
    'barangay.read',
    'patrol.manage',
    'patrol.assign',
    'patrol.start',
    'patrol.end',
    'patrol.monitor',
    'checkpoint.manage',
    'checkpoint.scan',
    'checkpoint.read',
    'incident.review',
    'incident.report',
    'incident.read',
    'gis.view',
    'reports.view',
    'resident.report',
    'resident.track',
    'resident.manage',
    'sync.write',
    'sync.read',
    'audit.view',
    'system.config',
  ],
  BARANGAY_ADMIN: [
    'users.read',
    'users.create',
    'users.update',
    'barangay.read',
    'patrol.manage',
    'patrol.assign',
    'patrol.monitor',
    'checkpoint.manage',
    'checkpoint.read',
    'incident.review',
    'incident.report',
    'incident.read',
    'gis.view',
    'reports.view',
    'resident.track',
    'resident.manage',
    'sync.write',
    'sync.read',
    'audit.view',
  ],
  TANOD: [
    'patrol.start',
    'patrol.end',
    'checkpoint.scan',
    'checkpoint.read',
    'incident.report',
    'incident.read',
    'resident.track',
    'sync.write',
    'sync.read',
  ],
  RESIDENT: ['resident.report', 'resident.track', 'sync.write', 'sync.read'],
};
