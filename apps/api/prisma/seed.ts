import { PrismaClient, Role, IncidentSeverity } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/**
 * DEVELOPMENT BASE SEED
 * Provisions the platform catalogue (roles, incident categories) plus a single
 * demo barangay and demo accounts for local development. No synthetic
 * operational data (incidents, checkpoints, patrol schedules) is created so the
 * system runs on real data entered through the app.
 */

async function main() {
  console.log('Seeding base data...');

  // --- Roles ---
  const roleNames = Object.values(Role);
  for (const name of roleNames) {
    await prisma.roleRecord.upsert({
      where: { name },
      update: {},
      create: { name, isSystem: true },
    });
  }
  const roleMap = {} as Record<Role, string>;
  for (const r of await prisma.roleRecord.findMany()) {
    roleMap[r.name] = r.id;
  }

  // --- Barangay ---
  const barangay = await prisma.barangay.upsert({
    where: { code: 'DEMO-BGY' },
    update: {},
    create: {
      name: 'Demo Barangay (Mamburao)',
      code: 'DEMO-BGY',
      description: 'DEMO data for development and testing only.',
      latitude: 13.2233,
      longitude: 120.596,
    },
  });

  // --- Users (demo) ---
  // Super admin credentials are NOT printed and can be set via the
  // SUPERADMIN_PASSWORD env var. All demo accounts share DemoPass123! in dev.
  const demoHash = await argon2.hash('DemoPass123!');
  const superadminHash = await argon2.hash(process.env.SUPERADMIN_PASSWORD ?? 'DemoPass123!');
  const demoUsers = [
    { username: 'superadmin', fullName: 'E-Tanod Administrator', role: Role.SUPER_ADMIN },
    { username: 'barangayadmin', fullName: 'Demo Barangay Admin', role: Role.BARANGAY_ADMIN },
    { username: 'tanod1', fullName: 'Demo Tanod One', role: Role.TANOD },
    { username: 'tanod2', fullName: 'Demo Tanod Two', role: Role.TANOD },
    { username: 'resident1', fullName: 'Demo Resident One', role: Role.RESIDENT },
  ];

  const created: Record<string, { id: string; primaryRole: Role }> = {};
  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        passwordHash: u.role === Role.SUPER_ADMIN ? superadminHash : demoHash,
        fullName: u.fullName,
        barangayId: u.role === Role.SUPER_ADMIN ? null : barangay.id,
        primaryRoleId: roleMap[u.role],
        isVerified: true,
        profile: { create: { contactNumber: '09xx-xxx-xxxx', escooter: false, barangayId: u.role === Role.SUPER_ADMIN ? null : barangay.id } },
        roles: { create: { roleId: roleMap[u.role] } },
      },
    });
    created[u.username] = { id: user.id, primaryRole: u.role };
  }

  // Ensure roles array includes primary role (upsert may not create role join)
  for (const u of demoUsers) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: created[u.username].id, roleId: roleMap[u.role] } },
      update: {},
      create: { userId: created[u.username].id, roleId: roleMap[u.role] },
    });
  }

  // --- Incident Categories ---
  const categories = [
    { code: 'THEFT', name: 'Theft', severity: IncidentSeverity.MEDIUM },
    { code: 'ASSAULT', name: 'Assault', severity: IncidentSeverity.HIGH },
    { code: 'NOISE', name: 'Noise Disturbance', severity: IncidentSeverity.LOW },
    { code: 'TRAFFIC', name: 'Traffic Incident', severity: IncidentSeverity.MEDIUM },
    { code: 'EMERGENCY', name: 'Emergency', severity: IncidentSeverity.CRITICAL },
    { code: 'SUSPICIOUS', name: 'Suspicious Activity', severity: IncidentSeverity.LOW },
  ];
  for (const c of categories) {
    await prisma.incidentCategory.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }

  console.log('Seeding complete.');
  console.log('DEMO accounts (password: DemoPass123!): barangayadmin, tanod1, tanod2, resident1');
  if (process.env.SUPERADMIN_PASSWORD) {
    console.log('Super admin: configured via SUPERADMIN_PASSWORD (kept secret, not shown).');
  } else {
    console.log('Super admin: using the default dev password (set SUPERADMIN_PASSWORD in production).');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
