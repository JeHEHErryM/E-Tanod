import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { IncidentSeverity, IncidentSource, IncidentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SocketService } from '../socket/socket.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth-user.interface';
import type {
  CreateResidentReportDto,
  UpdateResidentReportStatusDto,
} from './dto/resident-report.dto';

@Injectable()
export class ResidentReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socket: SocketService,
    private readonly audit: AuditService,
  ) {}

  private token(length = 8): string {
    return randomBytes(16).toString('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, length).toUpperCase();
  }

  private async uniqueTrackingCode(): Promise<string> {
    for (let i = 0; i < 5; i += 1) {
      const code = `ET-${this.token(8)}`;
      const exists = await this.prisma.residentReport.findUnique({ where: { trackingCode: code } });
      if (!exists) return code;
    }
    return `ET-${Date.now().toString(36).toUpperCase()}`;
  }

  private async uniqueIncidentCode(): Promise<string> {
    for (let i = 0; i < 5; i += 1) {
      const code = `RES-${Date.now().toString(36).toUpperCase()}-${this.token(4)}`;
      const exists = await this.prisma.incident.findUnique({ where: { code } });
      if (!exists) return code;
    }
    return `RES-${Date.now().toString(36).toUpperCase()}`;
  }

  /**
   * Submit a resident report (public / anonymous). A matching incident is created
   * so it flows into the same review, GIS, and analytics pipeline.
   */
  async create(dto: CreateResidentReportDto) {
    const category = dto.categoryId
      ? await this.prisma.incidentCategory.findUnique({ where: { id: dto.categoryId } })
      : await this.prisma.incidentCategory.findFirst({ where: { code: 'SUSPICIOUS' } });

    if (!category) {
      throw new NotFoundException('Incident category not available');
    }

    const isAnonymous = !dto.contact;
    const trackingCode = await this.uniqueTrackingCode();

    const report = await this.prisma.residentReport.create({
      data: {
        trackingCode,
        barangayId: dto.barangayId ?? null,
        isAnonymous,
        contact: dto.contact ?? null,
        message: dto.message ?? dto.description,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
      },
    });

    const incident = await this.prisma.incident.create({
      data: {
        code: await this.uniqueIncidentCode(),
        categoryId: category.id,
        description: dto.description,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        barangayId: dto.barangayId ?? null,
        severity: category.severity as IncidentSeverity,
        source: isAnonymous ? IncidentSource.ANONYMOUS : IncidentSource.RESIDENT,
        isAnonymous,
        residentReportId: report.id,
      },
    });

    await this.prisma.residentReport.update({
      where: { id: report.id },
      data: { status: incident.status },
    });

    await this.audit.log(null, 'RESIDENT_REPORT_CREATED', 'ResidentReport', report.id, {
      trackingCode,
      incidentCode: incident.code,
      barangayId: report.barangayId,
    });

    const payload = {
      incidentId: incident.id,
      code: incident.code,
      category: category.name,
      severity: incident.severity,
      reportId: report.id,
      trackingCode,
    };
    if (report.barangayId) {
      this.socket.emitToBarangay(report.barangayId, 'incident.created', payload);
    }
    this.socket.emitToRole('SUPER_ADMIN', 'incident.created', payload);

    return {
      id: report.id,
      trackingCode,
      status: incident.status,
      createdAt: report.createdAt,
    };
  }

  /** Admin review queue: reports scoped to the actor's barangay. */
  async list(
    query: { page: number; pageSize: number; status?: string },
    actor: AuthUser,
  ) {
    const where: Prisma.ResidentReportWhereInput = {};
    if (actor.primaryRole !== 'SUPER_ADMIN') {
      where.barangayId = actor.barangayId ?? '__none__';
    }
    if (query.status) where.status = query.status as IncidentStatus;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.residentReport.findMany({
        where,
        include: {
          barangay: { select: { id: true, name: true } },
          incident: {
            select: {
              id: true,
              code: true,
              status: true,
              severity: true,
              category: { select: { id: true, name: true } },
              reportedAt: true,
            },
          },
          attachments: { select: { id: true, url: true, fileName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.residentReport.count({ where }),
    ]);

    return {
      data,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  /** Admin review action: advance the report (and its incident) status. */
  async updateStatus(id: string, dto: UpdateResidentReportStatusDto, actor: AuthUser) {
    const report = await this.prisma.residentReport.findUnique({
      where: { id },
      include: { incident: { select: { id: true } } },
    });
    if (!report) throw new NotFoundException('Resident report not found');
    if (actor.primaryRole !== 'SUPER_ADMIN' && report.barangayId !== actor.barangayId) {
      throw new ForbiddenException('Report is outside your barangay');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.residentReport.update({ where: { id }, data: { status: dto.status } });
      if (report.incident) {
        await tx.incident.update({ where: { id: report.incident.id }, data: { status: dto.status } });
        await tx.incidentStatusHistory.create({
          data: {
            incidentId: report.incident.id,
            status: dto.status,
            note: dto.note ?? 'Resident report reviewed',
            changedByUserId: actor.id,
          },
        });
      }
    });

    await this.audit.log(actor.id, 'RESIDENT_REPORT_REVIEWED', 'ResidentReport', id, {
      status: dto.status,
    });

    const payload = {
      reportId: id,
      trackingCode: report.trackingCode,
      status: dto.status,
    };
    if (report.barangayId) {
      this.socket.emitToBarangay(report.barangayId, 'incident.status', payload);
    }
    this.socket.emitToRole('SUPER_ADMIN', 'incident.status', payload);

    return { id, status: dto.status };
  }

  /** Remove a report and its linked incident (admin cleanup). */
  async remove(id: string, actor: AuthUser) {
    const report = await this.prisma.residentReport.findUnique({
      where: { id },
      include: { incident: { select: { id: true } }, _count: { select: { attachments: true } } },
    });
    if (!report) throw new NotFoundException('Resident report not found');
    if (actor.primaryRole !== 'SUPER_ADMIN' && report.barangayId !== actor.barangayId) {
      throw new ForbiddenException('Report is outside your barangay');
    }

    await this.prisma.$transaction(async (tx) => {
      if (report.incident) {
        await tx.incidentStatusHistory.deleteMany({ where: { incidentId: report.incident.id } });
        await tx.incident.delete({ where: { id: report.incident.id } });
      }
      await tx.residentReport.delete({ where: { id } });
    });

    await this.audit.log(actor.id, 'RESIDENT_REPORT_DELETED', 'ResidentReport', id, {
      trackingCode: report.trackingCode,
    });

    return { success: true };
  }

  /** Public status lookup by tracking code — returns only non-sensitive fields. */
  async track(trackingCode: string) {
    const report = await this.prisma.residentReport.findUnique({
      where: { trackingCode: trackingCode.trim().toUpperCase() },
      include: {
        incident: {
          select: {
            code: true,
            status: true,
            severity: true,
            category: { select: { name: true } },
            reportedAt: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('No report found for that tracking code');
    }

    return {
      trackingCode: report.trackingCode,
      status: report.status,
      createdAt: report.createdAt,
      incident: report.incident
        ? {
            code: report.incident.code,
            status: report.incident.status,
            severity: report.incident.severity,
            category: report.incident.category.name,
            reportedAt: report.incident.reportedAt,
          }
        : null,
    };
  }
}
