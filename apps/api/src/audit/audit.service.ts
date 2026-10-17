import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/auth-user.interface';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    actorId: string | null,
    action: string,
    resourceType?: string | null,
    resourceId?: string | null,
    metadata?: Record<string, unknown> | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        resourceType,
        resourceId,
        metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress,
        userAgent,
      },
    });
  }

  async findAll(
    params: { actorId?: string; action?: string; page: number; pageSize: number },
    actor?: AuthUser,
  ) {
    const where: Prisma.AuditLogWhereInput = {};
    if (params.actorId) where.actorId = params.actorId;
    if (params.action) where.action = params.action;
    // Barangay admins only see activity from users in their own barangay.
    if (actor && actor.primaryRole !== 'SUPER_ADMIN') {
      where.actor = { is: { barangayId: actor.barangayId ?? '__none__' } };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, username: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }
}
