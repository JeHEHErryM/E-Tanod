import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      activePatrols,
      completedPatrols,
      todayIncidents,
      openReports,
      missedCheckpoints,
    ] = await this.prisma.$transaction([
      this.prisma.patrolAssignment.count({ where: { status: 'ACTIVE' } }),
      this.prisma.patrolAssignment.count({ where: { status: 'COMPLETED' } }),
      this.prisma.incident.count({ where: { reportedAt: { gte: startOfDay } } }),
      this.prisma.residentReport.count({ where: { status: 'PENDING' } }),
      this.prisma.checkpointScan.count({ where: { result: { in: ['OUTSIDE_RADIUS', 'INVALID'] } } }),
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
