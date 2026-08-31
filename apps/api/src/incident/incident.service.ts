import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IncidentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SocketService } from '../socket/socket.service';
import { AuditService } from '../audit/audit.service';
import { CreateIncidentDto, UpdateIncidentStatusDto } from './dto/incident.dto';

@Injectable()
export class IncidentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socket: SocketService,
    private readonly audit: AuditService,
  ) {}

  async categories() {
    return this.prisma.incidentCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async list(query: {
    page: number;
    pageSize: number;
    barangayId?: string;
    status?: string;
    categoryId?: string;
  }) {
    const where: Prisma.IncidentWhereInput = {};
    if (query.barangayId) where.barangayId = query.barangayId;
    if (query.status) where.status = query.status as IncidentStatus;
    if (query.categoryId) where.categoryId = query.categoryId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.incident.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, code: true } },
          barangay: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { reportedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.incident.count({ where }),
    ]);

    return {
      data,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async getOne(id: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        category: true,
        barangay: true,
        createdBy: { select: { id: true, fullName: true, username: true } },
        verifiedBy: { select: { id: true, fullName: true, username: true } },
        attachments: true,
        statusHistory: {
          include: { changedBy: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  async create(dto: CreateIncidentDto, reporter: { id: string; username: string }) {
    const category = await this.prisma.incidentCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new BadRequestException('Invalid incident category');

    const code = await this.generateCode();

    const incident = await this.prisma.incident.create({
      data: {
        code,
        categoryId: dto.categoryId,
        description: dto.description,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        barangayId: dto.barangayId ?? null,
        severity: dto.severity ?? category.severity,
        source: 'TANOD',
        createdById: reporter.id,
        statusHistory: {
          create: {
            status: 'PENDING',
            note: 'Incident reported',
            changedByUserId: reporter.id,
          },
        },
      },
      include: {
        category: { select: { id: true, name: true, code: true } },
        barangay: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    await this.audit.log(reporter.id, 'INCIDENT_CREATED', 'Incident', incident.id, { code });
    this.socket.emitPublic('incident.created', {
      incidentId: incident.id,
      code: incident.code,
      category: incident.category.name,
      severity: incident.severity,
    });

    return incident;
  }

  async updateStatus(
    id: string,
    dto: UpdateIncidentStatusDto,
    actorId: string,
  ) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.status === 'VERIFIED') {
        await tx.incident.update({
          where: { id },
          data: { status: dto.status, verifiedById: actorId, verifiedAt: new Date() },
        });
      } else {
        await tx.incident.update({ where: { id }, data: { status: dto.status } });
      }
      return tx.incidentStatusHistory.create({
        data: {
          incidentId: id,
          status: dto.status,
          note: dto.note,
          changedByUserId: actorId,
        },
      });
    });

    await this.audit.log(actorId, 'INCIDENT_UPDATED', 'Incident', id, { status: dto.status });

    // Notify the reporter of the status change when there is one.
    if (incident.createdById) {
      this.socket.emitToUser(incident.createdById, 'incident.status', {
        incidentId: id,
        code: incident.code,
        status: dto.status,
      });
    }

    return updated;
  }

  private async generateCode(): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.incident.count();
    return `INC-${date}-${String(count + 1).padStart(4, '0')}`;
  }
}
