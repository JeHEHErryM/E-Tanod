import { Injectable, Logger } from '@nestjs/common';
import { Prisma, SyncState } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CheckpointService } from '../checkpoint/checkpoint.service';
import { IncidentService } from '../incident/incident.service';
import { PatrolService } from '../patrol/patrol.service';
import type { AuthUser } from '../auth/auth-user.interface';
import { SYNC_ENTITY_TYPES, type SyncRecordDto } from './dto/sync.dto';

export interface SyncResult {
  clientId: string;
  state: SyncState;
  entityId?: string;
  duplicate?: boolean;
  error?: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly checkpoints: CheckpointService,
    private readonly incidents: IncidentService,
    private readonly patrol: PatrolService,
  ) {}

  /**
   * Apply a batch of client-queued records idempotently. A record is keyed by its
   * clientId, so replaying an already-synced record is a no-op (never duplicates).
   */
  async push(records: SyncRecordDto[], user: AuthUser): Promise<{ results: SyncResult[] }> {
    const results: SyncResult[] = [];
    for (const record of records) {
      results.push(await this.applyOne(record, user));
    }
    return { results };
  }

  private async applyOne(record: SyncRecordDto, user: AuthUser): Promise<SyncResult> {
    if (!SYNC_ENTITY_TYPES.includes(record.entityType as never)) {
      // Reject just this record; never abort the rest of the batch.
      return {
        clientId: record.clientId,
        state: SyncState.FAILED,
        error: `Unsupported entity type: ${record.entityType}`,
      };
    }

    const existing = await this.prisma.syncRecord.findUnique({
      where: { clientId: record.clientId },
    });

    if (existing && existing.state === SyncState.SYNCED) {
      return { clientId: record.clientId, state: SyncState.SYNCED, entityId: existing.entityId, duplicate: true };
    }

    const saved = existing
      ? await this.prisma.syncRecord.update({
          where: { clientId: record.clientId },
          data: { state: SyncState.SYNCING, attemptCount: { increment: 1 } },
        })
      : await this.prisma.syncRecord.create({
          data: {
            userId: user.id,
            entityType: record.entityType,
            entityId: record.entityId ?? '',
            clientId: record.clientId,
            operation: record.operation,
            payload: (record.payload ?? {}) as Prisma.InputJsonValue,
            state: SyncState.SYNCING,
          },
        });

    try {
      const entityId = await this.replay(record, user);
      await this.prisma.syncRecord.update({
        where: { id: saved.id },
        data: { state: SyncState.SYNCED, entityId: entityId ?? saved.entityId, error: null },
      });
      return { clientId: record.clientId, state: SyncState.SYNCED, entityId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      this.logger.warn(`Sync replay failed for ${record.clientId}: ${message}`);
      await this.prisma.syncRecord.update({
        where: { id: saved.id },
        data: { state: SyncState.FAILED, error: message },
      });
      return { clientId: record.clientId, state: SyncState.FAILED, error: message };
    }
  }

  /** Execute the queued operation by delegating to the owning service. */
  private async replay(record: SyncRecordDto, user: AuthUser): Promise<string | undefined> {
    const payload = (record.payload ?? {}) as Record<string, unknown>;
    const num = (value: unknown) => (typeof value === 'number' ? value : undefined);

    switch (record.entityType) {
      case 'CHECKPOINT_SCAN': {
        const result = await this.checkpoints.scan(
          {
            token: String(payload.token ?? ''),
            latitude: num(payload.latitude),
            longitude: num(payload.longitude),
            accuracy: num(payload.accuracy),
          },
          user.id,
        );
        return (result as { id?: string; checkpointId?: string }).id ?? (result as { checkpointId?: string }).checkpointId;
      }
      case 'INCIDENT': {
        const result = await this.incidents.create(payload as never, user);
        return (result as { id?: string }).id;
      }
      case 'PATROL_LOCATION': {
        const sessionId = String(record.entityId ?? payload.sessionId ?? '');
        await this.patrol.recordLocation(
          sessionId,
          user.id,
          Number(payload.latitude),
          Number(payload.longitude),
          num(payload.accuracy),
        );
        return sessionId;
      }
      default:
        throw new Error(`Unsupported entity type: ${record.entityType}`);
    }
  }

  /** Aggregate sync state counts + recent activity for the current user. */
  async status(user: AuthUser) {
    const grouped = await this.prisma.syncRecord.groupBy({
      by: ['state'],
      where: { userId: user.id },
      _count: { _all: true },
    });

    const counts: Record<SyncState, number> = {
      PENDING: 0,
      SYNCING: 0,
      SYNCED: 0,
      FAILED: 0,
      CONFLICT: 0,
    };
    for (const group of grouped) {
      counts[group.state] = group._count._all;
    }

    const recent = await this.prisma.syncRecord.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        clientId: true,
        entityType: true,
        operation: true,
        state: true,
        error: true,
        attemptCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { counts, recent };
  }
}
