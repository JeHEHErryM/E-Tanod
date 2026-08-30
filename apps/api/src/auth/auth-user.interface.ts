import type { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  primaryRole: Role;
  roles: Role[];
  barangayId?: string | null;
  isActive: boolean;
  isVerified: boolean;
}
