import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/auth-user.interface';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(actor?: AuthUser) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Barangay admins/officals only see their own barangay; super admins see all.
    const barangayId =
      actor && actor.primaryRole !== 'SUPER_ADMIN' ? (actor.barangayId ?? '__none__') : null;

    const assignmentWhere: Prisma.PatrolAssignmentWhereInput = barangayId
      ? { patrolSchedule: { barangayId } }
      : {};
    const incidentWhere: Prisma.IncidentWhereInput = {
      reportedAt: { gte: startOfDay },
      ...(barangayId ? { barangayId } : {}),
    };
    const reportWhere: Prisma.ResidentReportWhereInput = {
      status: 'PENDING',
      ...(barangayId ? { barangayId } : {}),
    };
    const scanWhere: Prisma.CheckpointScanWhereInput = {
      result: { in: ['OUTSIDE_RADIUS', 'INVALID'] },
      scannedAt: { gte: startOfDay },
      ...(barangayId ? { checkpoint: { is: { barangayId } } } : {}),
    };

    const [
      activePatrols,
      completedPatrols,
      todayIncidents,
      openReports,
      missedCheckpoints,
    ] = await this.prisma.$transaction([
      this.prisma.patrolAssignment.count({
        where: { status: 'ACTIVE', ...assignmentWhere },
      }),
      this.prisma.patrolAssignment.count({
        where: { status: 'COMPLETED', ...assignmentWhere },
      }),
      this.prisma.incident.count({ where: incidentWhere }),
      this.prisma.residentReport.count({ where: reportWhere }),
      this.prisma.checkpointScan.count({ where: scanWhere }),
    ]);

    return {
      activePatrols,
      completedPatrols,
      todayIncidents,
      openReports,
      missedCheckpoints,
    };
  }
}
