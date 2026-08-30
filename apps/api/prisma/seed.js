"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const prisma = new client_1.PrismaClient();
/**
 * DEVELOPMENT SEED DATA
 * All data is clearly labelled as DEMO data and does NOT represent real
 * crime statistics or real Mamburao residents.
 */
async function main() {
    console.log('Seeding demo data...');
    // --- Roles ---
    const roleNames = Object.values(client_1.Role);
    for (const name of roleNames) {
        await prisma.roleRecord.upsert({
            where: { name },
            update: {},
            create: { name, isSystem: true },
        });
    }
    const roleMap = {};
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
    const passwordHash = await argon2.hash('DemoPass123!');
    const demoUsers = [
        { username: 'superadmin', fullName: 'Demo Super Admin', role: client_1.Role.SUPER_ADMIN },
        { username: 'barangayadmin', fullName: 'Demo Barangay Admin', role: client_1.Role.BARANGAY_ADMIN },
        { username: 'tanod1', fullName: 'Demo Tanod One', role: client_1.Role.TANOD },
        { username: 'tanod2', fullName: 'Demo Tanod Two', role: client_1.Role.TANOD },
        { username: 'resident1', fullName: 'Demo Resident One', role: client_1.Role.RESIDENT },
    ];
    const created = {};
    for (const u of demoUsers) {
        const user = await prisma.user.upsert({
            where: { username: u.username },
            update: {},
            create: {
                username: u.username,
                passwordHash,
                fullName: u.fullName,
                barangayId: u.role === client_1.Role.SUPER_ADMIN ? null : barangay.id,
                primaryRoleId: roleMap[u.role],
                isVerified: true,
                profile: { create: { contactNumber: '09xx-xxx-xxxx', escooter: false, barangayId: u.role === client_1.Role.SUPER_ADMIN ? null : barangay.id } },
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
        { code: 'THEFT', name: 'Theft', severity: client_1.IncidentSeverity.MEDIUM },
        { code: 'ASSAULT', name: 'Assault', severity: client_1.IncidentSeverity.HIGH },
        { code: 'NOISE', name: 'Noise Disturbance', severity: client_1.IncidentSeverity.LOW },
        { code: 'TRAFFIC', name: 'Traffic Incident', severity: client_1.IncidentSeverity.MEDIUM },
        { code: 'EMERGENCY', name: 'Emergency', severity: client_1.IncidentSeverity.CRITICAL },
        { code: 'SUSPICIOUS', name: 'Suspicious Activity', severity: client_1.IncidentSeverity.LOW },
    ];
    for (const c of categories) {
        await prisma.incidentCategory.upsert({
            where: { code: c.code },
            update: {},
            create: c,
        });
    }
    // --- Demo Checkpoints ---
    const checkpointDefs = [
        { code: 'CP-001', name: 'Barangay Hall', lat: 13.2233, lng: 120.596 },
        { code: 'CP-002', name: 'Poblacion Market', lat: 13.2245, lng: 120.5972 },
        { code: 'CP-003', name: 'Seaside Road', lat: 13.2228, lng: 120.5991 },
    ];
    const checkpointMap = {};
    for (const c of checkpointDefs) {
        const checkpoint = await prisma.checkpoint.upsert({
            where: { code: c.code },
            update: {},
            create: {
                code: c.code,
                name: c.name,
                latitude: c.lat,
                longitude: c.lng,
                radiusMeters: 50,
                barangayId: barangay.id,
                status: 'ACTIVE',
            },
        });
        checkpointMap[c.code] = checkpoint.id;
        // QR token
        await prisma.checkpointQRToken.upsert({
            where: { checkpointId: checkpoint.id },
            update: {},
            create: {
                checkpointId: checkpoint.id,
                token: `qt_${c.code.toLowerCase()}_${checkpoint.code}`,
            },
        });
    }
    // --- Demo Patrol Schedule ---
    const today = new Date().toISOString().slice(0, 10);
    const schedule = await prisma.patrolSchedule.create({
        data: {
            title: 'DEMO Night Patrol',
            description: 'DEMO schedule for development.',
            barangayId: barangay.id,
            scheduledDate: today,
            startTime: '18:00',
            endTime: '22:00',
            createdById: created['barangayadmin'].id,
            assignments: {
                create: {
                    tanodId: created['tanod1'].id,
                    status: 'SCHEDULED',
                    scheduledAt: new Date(),
                },
            },
            requiredCheckpoints: {
                create: Object.values(checkpointMap).map((id, i) => ({ checkpointId: id, order: i + 1 })),
            },
        },
    });
    console.log('Seeding complete.');
    console.log('DEMO accounts (password: DemoPass123!): superadmin, barangayadmin, tanod1, tanod2, resident1');
    console.log(`DEMO patrol schedule: ${schedule.id}`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map