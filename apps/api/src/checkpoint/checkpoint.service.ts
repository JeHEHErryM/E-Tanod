import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma, ScanResult } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SocketService } from '../socket/socket.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth-user.interface';
import { haversineMeters } from '../common/geo.util';
import {
  CreateCheckpointDto,
  UpdateCheckpointDto,
  ScanCheckpointDto,
} from './dto/checkpoint.dto';

const QR_TOKEN_TTL_DAYS = 30;
const MAX_GPS_ACCURACY_METERS = 200;

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

  private qrExpiry(): Date {
    return new Date(Date.now() + QR_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  }

  async list(query: { page: number; pageSize: number; barangayId?: string; status?: string }, actor: AuthUser) {
    const where: Prisma.CheckpointWhereInput = {};
    if (actor.primaryRole !== 'SUPER_ADMIN') {
      where.barangayId = actor.barangayId ?? '__none__';
    } else if (query.barangayId) {
      where.barangayId = query.barangayId;
    }
    if (query.status) where.status = query.status as never;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.checkpoint.findMany({
        where,
        include: {
          barangay: { select: { id: true, name: true } },
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

  async getOne(id: string, actor: AuthUser) {
    const checkpoint = await this.prisma.checkpoint.findUnique({
      where: { id },
      include: { barangay: { select: { id: true, name: true } } },
    });
    if (!checkpoint) throw new NotFoundException('Checkpoint not found');
    if (actor.primaryRole !== 'SUPER_ADMIN' && checkpoint.barangayId !== actor.barangayId) {
      throw new ForbiddenException('Checkpoint is outside your barangay');
    }
    return checkpoint;
  }

  /** Admin-only accessor for the QR token (never exposed through list/getOne). */
  async getQr(id: string, actor: AuthUser) {
    const checkpoint = await this.prisma.checkpoint.findUnique({
      where: { id },
      include: { qrToken: { select: { token: true, validUntil: true } } },
    });
    if (!checkpoint) throw new NotFoundException('Checkpoint not found');
    if (actor.primaryRole !== 'SUPER_ADMIN' && checkpoint.barangayId !== actor.barangayId) {
      throw new ForbiddenException('Checkpoint is outside your barangay');
    }
    return checkpoint.qrToken;
  }

  async create(dto: CreateCheckpointDto, actor: AuthUser) {
    if (actor.primaryRole !== 'SUPER_ADMIN') {
      if (dto.barangayId && dto.barangayId !== actor.barangayId) {
        throw new ForbiddenException('Cannot create checkpoints outside your barangay');
      }
      if (!actor.barangayId) {
        throw new ForbiddenException('Your account is not assigned to a barangay');
      }
    }
    const checkpoint = await this.prisma.checkpoint.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusMeters: dto.radiusMeters ?? 50,
        barangayId: dto.barangayId ?? actor.barangayId ?? null,
        createdById: actor.id,
        qrToken: { create: { token: this.generateQrToken(), validUntil: this.qrExpiry() } },
      },
      include: { barangay: { select: { id: true, name: true } } },
    });

    await this.audit.log(actor.id, 'CHECKPOINT_CREATED', 'Checkpoint', checkpoint.id);
    return checkpoint;
  }

  async update(id: string, dto: UpdateCheckpointDto, actor: AuthUser) {
    const existing = await this.prisma.checkpoint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Checkpoint not found');
    if (actor.primaryRole !== 'SUPER_ADMIN' && existing.barangayId !== actor.barangayId) {
      throw new ForbiddenException('Checkpoint is outside your barangay');
    }

    const checkpoint = await this.prisma.checkpoint.update({
      where: { id },
      data: dto,
      include: { barangay: { select: { id: true, name: true } } },
    });

    await this.audit.log(actor.id, 'CHECKPOINT_UPDATED', 'Checkpoint', id);
    return checkpoint;
  }

  async remove(id: string, actor: AuthUser) {
    const existing = await this.prisma.checkpoint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Checkpoint not found');
    if (actor.primaryRole !== 'SUPER_ADMIN' && existing.barangayId !== actor.barangayId) {
      throw new ForbiddenException('Checkpoint is outside your barangay');
    }

    await this.prisma.checkpoint.delete({ where: { id } });
    await this.audit.log(actor.id, 'CHECKPOINT_DELETED', 'Checkpoint', id);
    return { success: true };
  }

  async regenerateQr(id: string, actor: AuthUser) {
    const existing = await this.prisma.checkpoint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Checkpoint not found');
    if (actor.primaryRole !== 'SUPER_ADMIN' && existing.barangayId !== actor.barangayId) {
      throw new ForbiddenException('Checkpoint is outside your barangay');
    }

    const qrToken = await this.prisma.checkpointQRToken.update({
      where: { checkpointId: id },
      data: { token: this.generateQrToken(), validFrom: new Date(), validUntil: this.qrExpiry() },
    });

    await this.audit.log(actor.id, 'QR_REGENERATED', 'Checkpoint', id);
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
      return this.recordScan(null, null, null, tanodId, ScanResult.INVALID, null, null, null, null, 'Invalid or expired QR token');
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
        null,
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
        null,
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
        null,
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
        null,
        'Device location unavailable',
      );
    }

    // GPS accuracy guard: a position that is too imprecise must not count
    // as a verified visit to the checkpoint (docs §8 "accuracy thresholds").
    const accuracy = dto.accuracy ?? 0;
    if (accuracy > MAX_GPS_ACCURACY_METERS) {
      return this.recordScan(
        qr.checkpointId,
        qr.checkpoint,
        activeSession.id,
        tanodId,
        ScanResult.OUTSIDE_RADIUS,
        dto.latitude,
        dto.longitude,
        accuracy,
        null,
        `GPS accuracy too low (${Math.round(accuracy)}m)`,
      );
    }

    const distance = haversineMeters(
      { latitude: qr.checkpoint.latitude, longitude: qr.checkpoint.longitude },
      { latitude: dto.latitude, longitude: dto.longitude },
    );

    // Tolerance: the device's location uncertainty is added to the radius.
    const within = distance <= (qr.checkpoint.radiusMeters + accuracy);

    if (within) {
      // Inside radius -> valid, but guard against duplicate scans in the session.
      // The @@unique checkpointId+patrolSessionId constraint is the authoritative
      // guard; a raced creation surfaces as P2002 and maps to a friendly DUPLICATE.
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
          accuracy,
          distance,
          'Checkpoint already verified this session',
        );
      }

      try {
        return await this.recordScan(
          qr.checkpointId,
          qr.checkpoint,
          activeSession.id,
          tanodId,
          ScanResult.VALID,
          dto.latitude,
          dto.longitude,
          accuracy,
          distance,
          null,
        );
      } catch (e) {
        if (this.isUniqueViolation(e)) {
          return this.recordScan(
            qr.checkpointId,
            qr.checkpoint,
            activeSession.id,
            tanodId,
            ScanResult.DUPLICATE,
            dto.latitude,
            dto.longitude,
            accuracy,
            distance,
            'Checkpoint already verified this session',
          );
        }
        throw e;
      }
    }

    return this.recordScan(
      qr.checkpointId,
      qr.checkpoint,
      activeSession.id,
      tanodId,
      ScanResult.OUTSIDE_RADIUS,
      dto.latitude,
      dto.longitude,
      accuracy,
      distance,
      `Outside checkpoint radius (${Math.round(distance)}m)`,
    );
  }

  private isUniqueViolation(e: unknown): boolean {
    return (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
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
    distanceMeters: number | null,
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
        distanceMeters,
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
