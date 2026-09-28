import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { IncidentStatus, Prisma, type Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SocketService } from '../socket/socket.service';
import { AuditService } from '../audit/audit.service';
import { CreateIncidentDto, UpdateIncidentStatusDto } from './dto/incident.dto';

interface ReporterContext {
  id: string;
  username: string;
  primaryRole: Role;
  barangayId?: string | null;
}

const REPORTING_ROLES: Role[] = ['SUPER_ADMIN', 'BARANGAY_ADMIN'];
const MAX_ATTACHMENTS = 5;
const ALLOWED_MIME = /^image\/(jpeg|png|webp|heic|heif)$/;

@Injectable()
export class IncidentService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socket: SocketService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  /** Ensure the default incident catalogs exist on every boot. */
  async onModuleInit() {
    const defaults = [
      { code: 'THEFT', name: 'Theft', severity: 'MEDIUM' },
      { code: 'ASSAULT', name: 'Assault', severity: 'HIGH' },
      { code: 'NOISE', name: 'Noise Disturbance', severity: 'LOW' },
      { code: 'TRAFFIC', name: 'Traffic Incident', severity: 'MEDIUM' },
      { code: 'EMERGENCY', name: 'Emergency', severity: 'CRITICAL' },
      { code: 'SUSPICIOUS', name: 'Suspicious Activity', severity: 'LOW' },
    ] as const;
    for (const c of defaults) {
      try {
        await this.prisma.incidentCategory.upsert({
          where: { code: c.code },
          update: {},
          create: c,
        });
      } catch {
        // DB may not be ready on cold boot; categories are also seeded by prisma/seed.
      }
    }
  }

  private uploadDir() {
    return this.config.get<string>('UPLOAD_DIR', join(process.cwd(), 'uploads'));
  }

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
  }, actor: ReporterContext) {
    const where: Prisma.IncidentWhereInput = {};
    // Tenant isolation: non-super-admin roles only see their own barangay.
    if (actor.primaryRole !== 'SUPER_ADMIN') {
      where.barangayId = actor.barangayId ?? '__none__';
    }
    if (query.barangayId && actor.primaryRole === 'SUPER_ADMIN') where.barangayId = query.barangayId;
    if (query.status) where.status = query.status as IncidentStatus;
    if (query.categoryId) where.categoryId = query.categoryId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.incident.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, code: true } },
          barangay: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true, username: true } },
          attachments: { select: { id: true, url: true, fileName: true } },
        },
        orderBy: { reportedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.incident.count({ where }),
    ]);

    return {
      data: data.map((i) => (i.isAnonymous ? { ...i, createdBy: null } : i)),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async getOne(id: string, actor: ReporterContext) {
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

    if (actor.primaryRole === 'RESIDENT') {
      if (incident.createdById !== actor.id) {
        throw new ForbiddenException('You can only view your own reports');
      }
    } else if (actor.primaryRole !== 'SUPER_ADMIN') {
      if (incident.barangayId !== actor.barangayId) {
        throw new ForbiddenException('Incident is outside your barangay');
      }
    }

    if (incident.isAnonymous) incident.createdBy = null;
    return incident;
  }

  async create(dto: CreateIncidentDto, reporter: ReporterContext) {
    const category = await this.prisma.incidentCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new BadRequestException('Invalid incident category');

    const wantAnonymous = dto.isAnonymous === true;
    const source = wantAnonymous
      ? 'ANONYMOUS'
      : reporter.primaryRole === 'RESIDENT'
        ? 'RESIDENT'
        : REPORTING_ROLES.includes(reporter.primaryRole)
          ? 'ADMIN'
          : 'TANOD';

    const barangayId =
      reporter.primaryRole === 'SUPER_ADMIN'
        ? dto.barangayId ?? null
        : (dto.barangayId ?? reporter.barangayId ?? null);

    const code = await this.generateCode();

    const incident = await this.prisma.incident.create({
      data: {
        code,
        categoryId: dto.categoryId,
        description: dto.description,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        barangayId,
        severity: dto.severity ?? category.severity,
        source,
        isAnonymous: wantAnonymous,
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

  async mine(userId: string, page: number, pageSize: number) {
    const where: Prisma.IncidentWhereInput = { createdById: userId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.incident.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, code: true } },
          barangay: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true, username: true } },
          attachments: { select: { id: true, url: true, fileName: true } },
        },
        orderBy: { reportedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.incident.count({ where }),
    ]);

    return {
      data: data.map((i) => (i.isAnonymous ? { ...i, createdBy: null } : i)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async addAttachments(
    id: string,
    files: Express.Multer.File[],
    actor: ReporterContext,
  ) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');

    const isOwner = incident.createdById === actor.id;
    const isStaff =
      REPORTING_ROLES.includes(actor.primaryRole) &&
      (actor.primaryRole === 'SUPER_ADMIN' || incident.barangayId === actor.barangayId);
    if (!isOwner && !isStaff) {
      throw new ForbiddenException('You cannot attach files to this incident');
    }

    const existing = await this.prisma.incidentAttachment.count({
      where: { incidentId: id },
    });
    const remaining = MAX_ATTACHMENTS - existing;
    const accepted = files.slice(0, Math.max(remaining, 0));
    if (accepted.length === 0) {
      throw new BadRequestException(
        `Only ${MAX_ATTACHMENTS} attachments are allowed per incident`,
      );
    }

    const uploadDir = this.uploadDir();
    const incidentDir = join(uploadDir, 'incidents');
    await mkdir(incidentDir, { recursive: true });

    const saved: Prisma.IncidentAttachmentCreateManyInput[] = [];
    const failed: string[] = [];

    for (const file of accepted) {
      const mimeMatch = ALLOWED_MIME.test(file.mimetype ?? '');
      if (!mimeMatch) {
        failed.push(file.originalname);
        continue;
      }
      try {
        const name = randomUUID();
        const fullPath = join(incidentDir, `${name}.jpg`);
        const thumbPath = join(incidentDir, `${name}-thumb.jpg`);

        const image = sharp(file.buffer, { failOn: 'none' }).rotate();
        const meta = await image.metadata();
        if (!meta.width || !meta.height) {
          failed.push(file.originalname);
          continue;
        }

        const resized = await image
          .resize({ width: Math.min(meta.width, 1600), withoutEnlargement: true })
          .jpeg({ quality: 80, mozjpeg: true })
          .toBuffer();
        const thumbnail = await image
          .resize({ width: Math.min(meta.width, 480), withoutEnlargement: true })
          .jpeg({ quality: 72 })
          .toBuffer();

        await Promise.all([
          writeFile(fullPath, resized),
          writeFile(thumbPath, thumbnail),
        ]);

        saved.push({
          incidentId: id,
          url: `/uploads/incidents/${name}.jpg`,
          mimeType: 'image/jpeg',
          sizeBytes: resized.length,
          fileName: file.originalname,
        });
      } catch {
        failed.push(file.originalname);
      }
    }

    if (saved.length === 0) {
      throw new BadRequestException('No valid image files were uploaded');
    }

    await this.prisma.incidentAttachment.createMany({ data: saved });

    await this.audit.log(actor.id, 'INCIDENT_UPDATED', 'Incident', id, {
      attachmentsAdded: saved.length,
    });

    return {
      added: saved.length,
      skipped: failed.length,
      files: saved,
    };
  }

  async updateStatus(
    id: string,
    dto: UpdateIncidentStatusDto,
    actor: ReporterContext,
  ) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');
    if (actor.primaryRole !== 'SUPER_ADMIN' && incident.barangayId !== actor.barangayId) {
      throw new ForbiddenException('Incident is outside your barangay');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.status === 'VERIFIED') {
        await tx.incident.update({
          where: { id },
          data: { status: dto.status, verifiedById: actor.id, verifiedAt: new Date() },
        });
      } else {
        await tx.incident.update({ where: { id }, data: { status: dto.status } });
      }
      return tx.incidentStatusHistory.create({
        data: {
          incidentId: id,
          status: dto.status,
          note: dto.note,
          changedByUserId: actor.id,
        },
      });
    });

    await this.audit.log(actor.id, 'INCIDENT_UPDATED', 'Incident', id, { status: dto.status });

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
