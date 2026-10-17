import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async clearCheckpointScans(actorId: string) {
    const { count } = await this.prisma.checkpointScan.deleteMany({});
    await this.audit.log(actorId, 'ADMIN_ACTION', 'checkpointScan.purge', null, { deleted: count });
    return { deleted: count };
  }
}
