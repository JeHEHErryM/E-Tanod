import type { RoleName } from '@e-tanod/types';
import { Shield, ShieldCheck, ShieldAlert, Users, type LucideIcon } from 'lucide-react';

export interface RoleMeta {
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  tint: string;
  tone: 'brand' | 'emerald' | 'amber' | 'rose' | 'sky' | 'ink';
}

export const ROLE_META: Record<RoleName, RoleMeta> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    shortLabel: 'Super Admin',
    icon: ShieldAlert,
    tint: 'bg-rose-50 text-rose-700',
    tone: 'rose',
  },
  BARANGAY_ADMIN: {
    label: 'Barangay Admin',
    shortLabel: 'Barangay Admin',
    icon: ShieldCheck,
    tint: 'bg-amber-50 text-amber-700',
    tone: 'amber',
  },
  TANOD: {
    label: 'Tanod',
    shortLabel: 'Tanod',
    icon: Shield,
    tint: 'bg-sky-50 text-sky-700',
    tone: 'sky',
  },
  RESIDENT: {
    label: 'Resident',
    shortLabel: 'Resident',
    icon: Users,
    tint: 'bg-emerald-50 text-emerald-700',
    tone: 'emerald',
  },
};

export function roleMeta(role?: RoleName): RoleMeta {
  return (role && ROLE_META[role]) || ROLE_META.SUPER_ADMIN;
}

export const isAdmin = (role?: RoleName) =>
  role === 'SUPER_ADMIN' || role === 'BARANGAY_ADMIN';
export const isField = (role?: RoleName) => role === 'TANOD' || role === 'RESIDENT';
