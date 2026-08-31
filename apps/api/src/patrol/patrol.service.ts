import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PatrolStatus, ScanResult } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SocketService } from '../socket/socket.service';
import { AuditService } from '../audit/audit.service';
import {
  CreatePatrolScheduleDto,
  UpdatePatrolScheduleDto,
  StartPatrolDto,
} from './dto/patrol.dto';

@Injectable()
export class PatrolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socket: SocketService,
    private readonly audit: AuditService,
  ) {}

  async createSchedule(dto: CreatePatrolScheduleDto, actorId: string) {
    const { tanodIds, checkpoints, ...data } = dto;

    const schedule = await this.prisma.patrolSchedule.create({
      data: {
        ...data,
        createdById: actorId,
        requiredCheckpoints: {
          create: checkpoints.map((c) => ({
            checkpointId: c.checkpointId,
            order: c.order,
          })),
        },
        assignments: tanodIds?.length
          ? {
              create: tanodIds.map((tanodId) => ({
                tanodId,
                status: PatrolStatus.SCHEDULED,
                scheduledAt: new Date(),
              })),
            }
          : undefined,
      },
      include: {
        barangay: { select: { id: true, name: true } },
        requiredCheckpoints: { include: { checkpoint: true } },
        assignments: {
          include: { tanod: { select: { id: true, fullName: true, username: true } } },
        },
      },
    });

    if (tanodIds?.length) {
      for (const tanodId of tanodIds) {
        this.socket.emitToUser(tanodId, 'patrol.assigned', {
          scheduleId: schedule.id,
          title: schedule.title,
          scheduledDate: schedule.scheduledDate,
        });
      }
    }

    await this.audit.log(
      actorId,
      'PATROL_CREATED',
      'PatrolSchedule',
      schedule.id,
      { title: schedule.title },
    );

    return schedule;
  }

  async listSchedules(query: {
    page: number;
    pageSize: number;
    barangayId?: string;
    status?: string;
  }) {
    const where: Prisma.PatrolScheduleWhereInput = {};
    if (query.barangayId) where.barangayId = query.barangayId;
    if (query.status) {
      where.assignments = { some: { status: query.status as PatrolStatus } };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.patrolSchedule.findMany({
        where,
        include: {
          barangay: { select: { id: true, name: true } },
          requiredCheckpoints: { include: { checkpoint: true } },
          assignments: {
            include: { tanod: { select: { id: true, fullName: true, username: true } } },
            orderBy: { scheduledAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.patrolSchedule.count({ where }),
    ]);

    return {
      data,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async getSchedule(id: string) {
    const schedule = await this.prisma.patrolSchedule.findUnique({
      where: { id },
      include: {
        barangay: { select: { id: true, name: true } },
        requiredCheckpoints: { include: { checkpoint: true } },
        assignments: {
          include: { tanod: { select: { id: true, fullName: true, username: true } } },
        },
      },
    });
    if (!schedule) throw new NotFoundException('Patrol schedule not found');
    return schedule;
  }

  async updateSchedule(id: string, dto: UpdatePatrolScheduleDto, actorId: string) {
    const existing = await this.prisma.patrolSchedule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Patrol schedule not found');

    const { tanodIds, checkpoints, ...data } = dto;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (checkpoints) {
        await tx.patrolScheduleCheckpoint.deleteMany({ where: { patrolScheduleId: id } });
      }
      if (tanodIds) {
        await tx.patrolAssignment.deleteMany({ where: { patrolScheduleId: id } });
        await tx.patrolAssignment.createMany({
          data: tanodIds.map((tanodId) => ({
            patrolScheduleId: id,
            tanodId,
            status: PatrolStatus.SCHEDULED,
            scheduledAt: new Date(),
          })),
        });
      }
      return tx.patrolSchedule.update({
        where: { id },
        data: {
          ...data,
          requiredCheckpoints: checkpoints
            ? {
                create: checkpoints.map((c) => ({
                  checkpointId: c.checkpointId,
                  order: c.order,
                })),
              }
            : undefined,
        },
        include: {
          barangay: { select: { id: true, name: true } },
          requiredCheckpoints: { include: { checkpoint: true } },
          assignments: {
            include: { tanod: { select: { id: true, fullName: true, username: true } } },
          },
        },
      });
    });

    await this.audit.log(actorId, 'PATROL_UPDATED', 'PatrolSchedule', id);
    return updated;
  }

  async getMyAssignments(tanodId: string) {
    return this.prisma.patrolAssignment.findMany({
      where: { tanodId },
      include: {
        patrolSchedule: {
          include: {
            barangay: { select: { id: true, name: true } },
            requiredCheckpoints: { include: { checkpoint: true } },
          },
        },
        sessions: { orderBy: { startedAt: 'desc' }, take: 1 },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async getMyActiveSession(tanodId: string) {
    return this.prisma.patrolSession.findFirst({
      where: { tanodId, status: PatrolStatus.ACTIVE },
      include: {
        patrolAssignment: {
          include: {
            patrolSchedule: {
              include: {
                requiredCheckpoints: { include: { checkpoint: true } },
              },
            },
          },
        },
        checkpointScans: {
          include: { checkpoint: true },
          orderBy: { scannedAt: 'desc' },
        },
        locations: { orderBy: { recordedAt: 'desc' }, take: 50 },
      },
    });
  }

  async startPatrol(dto: StartPatrolDto, tanodId: string) {
    const assignment = await this.prisma.patrolAssignment.findUnique({
      where: { id: dto.patrolAssignmentId },
      include: { patrolSchedule: true },
    });
    if (!assignment) throw new NotFoundException('Patrol assignment not found');
    if (assignment.tanodId !== tanodId) {
      throw new BadRequestException('Assignment does not belong to this tanod');
    }

    const existingActive = await this.prisma.patrolSession.findFirst({
      where: { tanodId, status: PatrolStatus.ACTIVE },
    });
    if (existingActive) {
      throw new BadRequestException('You already have an active patrol session');
    }

    const session = await this.prisma.$transaction(async (tx) => {
      await tx.patrolAssignment.update({
        where: { id: assignment.id },
        data: { status: PatrolStatus.ACTIVE },
      });
      return tx.patrolSession.create({
        data: {
          patrolAssignmentId: assignment.id,
          tanodId,
          status: PatrolStatus.ACTIVE,
          notes: dto.notes,
        },
        include: { patrolAssignment: { include: { patrolSchedule: true } } },
      });
    });

    await this.audit.log(tanodId, 'PATROL_STARTED', 'PatrolSession', session.id);
    this.socket.emitPublic('patrol.started', {
      sessionId: session.id,
      tanodId,
      scheduleId: assignment.patrolSchedule.id,
      title: assignment.patrolSchedule.title,
    });

    return session;
  }

  async endPatrol(sessionId: string, notes: string | undefined, tanodId: string) {
    const session = await this.prisma.patrolSession.findUnique({
      where: { id: sessionId },
      include: { patrolAssignment: { include: { patrolSchedule: true } } },
    });
    if (!session) throw new NotFoundException('Patrol session not found');
    if (session.tanodId !== tanodId) {
      throw new BadRequestException('Session does not belong to this tanod');
    }
    if (session.status !== PatrolStatus.ACTIVE) {
      throw new BadRequestException('Patrol session is not active');
    }

    const remaining = await this.prisma.checkpointScan.count({
      where: {
        patrolSessionId: sessionId,
        result: { in: [ScanResult.VALID, ScanResult.DUPLICATE] },
      },
    });

    // If no valid checkpoint was verified, mark the patrol incomplete.
    const completed = remaining > 0 ? PatrolStatus.COMPLETED : PatrolStatus.INCOMPLETE;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.patrolSession.update({
        where: { id: sessionId },
        data: { status: completed, endedAt: new Date(), notes },
      });
      return tx.patrolAssignment.update({
        where: { id: session.patrolAssignmentId },
        data: { status: completed },
        include: { patrolSchedule: true },
      });
    });

    await this.audit.log(tanodId, 'PATROL_COMPLETED', 'PatrolSession', sessionId);
    this.socket.emitPublic('patrol.ended', {
      sessionId,
      tanodId,
      scheduleId: session.patrolAssignment.patrolSchedule.id,
      status: completed,
    });

    return { session: updated };
  }

  async recordLocation(
    sessionId: string,
    tanodId: string,
    lat: number,
    lng: number,
    accuracy?: number,
  ) {
    const session = await this.prisma.patrolSession.findFirst({
      where: { id: sessionId, tanodId, status: PatrolStatus.ACTIVE },
    });
    if (!session) throw new NotFoundException('Active patrol session not found');

    return this.prisma.patrolLocation.create({
      data: { patrolSessionId: sessionId, latitude: lat, longitude: lng, accuracy: accuracy ?? null },
    });
  }
}
