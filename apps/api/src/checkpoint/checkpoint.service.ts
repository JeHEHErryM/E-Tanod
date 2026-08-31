import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma, ScanResult } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SocketService } from '../socket/socket.service';
import { AuditService } from '../audit/audit.service';
import { isWithinRadius, haversineMeters } from '../common/geo.util';
import {
  CreateCheckpointDto,
  UpdateCheckpointDto,
  ScanCheckpointDto,
} from './dto/checkpoint.dto';

@Injectable()
export class CheckpointService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socket: SocketService,
    private readonly audit: AuditService,
  ) {}

  private generateQrToken(): string {
    return `qr_${randomBytes(16).toString('hex')}`;
  }

  async list(query: { page: number; pageSize: number; barangayId?: string; status?: string }) {
    const where: Prisma.CheckpointWhereInput = {};
    if (query.barangayId) where.barangayId = query.barangayId;
    if (query.status) where.status = query.status as never;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.checkpoint.findMany({
        where,
        include: {
          barangay: { select: { id: true, name: true } },
          qrToken: { select: { token: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.checkpoint.count({ where }),
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
    const checkpoint = await this.prisma.checkpoint.findUnique({
      where: { id },
      include: {
        barangay: { select: { id: true, name: true } },
        qrToken: { select: { token: true, validUntil: true } },
      },
    });
    if (!checkpoint) throw new NotFoundException('Checkpoint not found');
    return checkpoint;
  }

  async create(dto: CreateCheckpointDto, actorId: string) {
    const checkpoint = await this.prisma.checkpoint.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusMeters: dto.radiusMeters ?? 50,
        barangayId: dto.barangayId,
        createdById: actorId,
        qrToken: { create: { token: this.generateQrToken() } },
      },
      include: { barangay: { select: { id: true, name: true } }, qrToken: true },
    });

    await this.audit.log(actorId, 'CHECKPOINT_CREATED', 'Checkpoint', checkpoint.id);
    return checkpoint;
  }

  async update(id: string, dto: UpdateCheckpointDto, actorId: string) {
    const existing = await this.prisma.checkpoint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Checkpoint not found');

    const checkpoint = await this.prisma.checkpoint.update({
      where: { id },
      data: dto,
      include: { barangay: { select: { id: true, name: true } }, qrToken: true },
    });

    await this.audit.log(actorId, 'CHECKPOINT_UPDATED', 'Checkpoint', id);
    return checkpoint;
  }

  async remove(id: string, actorId: string) {
    const existing = await this.prisma.checkpoint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Checkpoint not found');

    await this.prisma.checkpoint.delete({ where: { id } });
    await this.audit.log(actorId, 'CHECKPOINT_DELETED', 'Checkpoint', id);
    return { success: true };
  }

  async regenerateQr(id: string, actorId: string) {
    const existing = await this.prisma.checkpoint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Checkpoint not found');

    const qrToken = await this.prisma.checkpointQRToken.update({
      where: { checkpointId: id },
      data: { token: this.generateQrToken(), validFrom: new Date() },
    });

    await this.audit.log(actorId, 'QR_REGENERATED', 'Checkpoint', id);
    this.socket.emitPublic('checkpoint.qr.regenerated', { checkpointId: id });
    return qrToken;
  }

  /**
   * Validate a QR scan. All validation is performed server-side:
   *   - requires an active patrol session for the tanod
   *   - the checkpoint must be part of the scheduled patrol
   *   - the scanned position must be within the checkpoint radius (haversine)
   */
  async scan(dto: ScanCheckpointDto, tanodId: string) {
    const qr = await this.prisma.checkpointQRToken.findUnique({
      where: { token: dto.token },
      include: { checkpoint: true },
    });
    if (!qr || (qr.validUntil && qr.validUntil < new Date())) {
      return this.recordScan(null, null, null, tanodId, ScanResult.INVALID, null, null, null, 'Invalid or expired QR token');
    }

    if (qr.checkpoint.status !== 'ACTIVE') {
      return this.recordScan(
        qr.checkpointId,
        qr.checkpoint,
        null,
        tanodId,
        ScanResult.INACTIVE,
        dto.latitude ?? null,
        dto.longitude ?? null,
        dto.accuracy ?? null,
        'Checkpoint is inactive',
      );
    }

    const activeSession = await this.prisma.patrolSession.findFirst({
      where: { tanodId, status: 'ACTIVE' },
      include: {
        patrolAssignment: {
          include: {
            patrolSchedule: { include: { requiredCheckpoints: true } },
          },
        },
      },
    });
    if (!activeSession) {
      return this.recordScan(
        qr.checkpointId,
        qr.checkpoint,
        null,
        tanodId,
        ScanResult.NOT_IN_PATROL,
        dto.latitude ?? null,
        dto.longitude ?? null,
        dto.accuracy ?? null,
        'No active patrol session',
      );
    }

    const inSchedule = activeSession.patrolAssignment.patrolSchedule.requiredCheckpoints.some(
      (rc) => rc.checkpointId === qr.checkpointId,
    );
    if (!inSchedule) {
      return this.recordScan(
        qr.checkpointId,
        qr.checkpoint,
        activeSession.id,
        tanodId,
        ScanResult.NOT_IN_PATROL,
        dto.latitude ?? null,
        dto.longitude ?? null,
        dto.accuracy ?? null,
        'Checkpoint is not part of the scheduled patrol',
      );
    }

    if (dto.latitude === undefined || dto.longitude === undefined) {
      return this.recordScan(
        qr.checkpointId,
        qr.checkpoint,
        activeSession.id,
        tanodId,
        ScanResult.LOCATION_UNAVAILABLE,
        null,
        null,
        dto.accuracy ?? null,
        'Device location unavailable',
      );
    }

    const distanceMeters = !isWithinRadius(
      { latitude: qr.checkpoint.latitude, longitude: qr.checkpoint.longitude },
      { latitude: dto.latitude, longitude: dto.longitude },
      qr.checkpoint.radiusMeters,
    )
      ? haversineMeters(
          { latitude: qr.checkpoint.latitude, longitude: qr.checkpoint.longitude },
          { latitude: dto.latitude, longitude: dto.longitude },
        )
      : null;

    if (distanceMeters === null) {
      // Inside radius -> valid, but guard against duplicate scans in the session.
      const existing = await this.prisma.checkpointScan.findUnique({
        where: {
          checkpointId_patrolSessionId: {
            checkpointId: qr.checkpointId,
            patrolSessionId: activeSession.id,
          },
        },
      });
      if (existing) {
        return this.recordScan(
          qr.checkpointId,
          qr.checkpoint,
          activeSession.id,
          tanodId,
          ScanResult.DUPLICATE,
          dto.latitude,
          dto.longitude,
          dto.accuracy ?? null,
          'Checkpoint already verified this session',
        );
      }

      return this.recordScan(
        qr.checkpointId,
        qr.checkpoint,
        activeSession.id,
        tanodId,
        ScanResult.VALID,
        dto.latitude,
        dto.longitude,
        dto.accuracy ?? null,
        null,
      );
    }

    return this.recordScan(
      qr.checkpointId,
      qr.checkpoint,
      activeSession.id,
      tanodId,
      ScanResult.OUTSIDE_RADIUS,
      dto.latitude,
      dto.longitude,
      dto.accuracy ?? null,
      `Outside checkpoint radius (${Math.round(distanceMeters)}m)`,
    );
  }

  private async recordScan(
    checkpointId: string | null,
    checkpoint: { id: string; name: string; code: string } | null,
    patrolSessionId: string | null,
    tanodId: string,
    result: ScanResult,
    latitude: number | null,
    longitude: number | null,
    accuracy: number | null,
    failureReason: string | null,
  ) {
    const record = await this.prisma.checkpointScan.create({
      data: {
        checkpointId,
        patrolSessionId,
        tanodId,
        latitude,
        longitude,
        accuracy,
        result,
        failureReason,
      },
    });

    if (result === ScanResult.VALID && checkpoint) {
      await this.audit.log(
        tanodId,
        'CHECKPOINT_VERIFIED',
        'Checkpoint',
        checkpoint.id,
        { checkpointCode: checkpoint.code },
      );
      this.socket.emitPublic('checkpoint.verified', {
        checkpointId: checkpoint.id,
        checkpointName: checkpoint.name,
        tanodId,
        scannedAt: record.scannedAt,
      });
    }

    return {
      result,
      failureReason,
      scannedAt: record.scannedAt,
      checkpoint: checkpoint
        ? { id: checkpoint.id, code: checkpoint.code, name: checkpoint.name }
        : null,
    };
  }
}
