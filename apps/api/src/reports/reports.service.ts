import { Injectable } from '@nestjs/common';
import { PatrolStatus, ScanResult } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/auth-user.interface';
import type { PatrolComplianceQueryDto } from './dto/reports.dto';

export interface ComplianceRow {
  tanodId: string;
  fullName: string;
  username: string;
  assigned: number;
  completed: number;
  sessions: number;
  validScans: number;
  complianceRate: number;
}

const DAY_MS = 86_400_000;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveScope(actor: AuthUser, requested?: string): string | null {
    if (actor.primaryRole === 'SUPER_ADMIN') return requested ?? null;
    // A non-super-admin without a barangay must never see global data.
    return actor.barangayId ?? '__none__';
  }

  private range(query: PatrolComplianceQueryDto) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * DAY_MS);
    return { from, to };
  }

  async patrolCompliance(
    query: PatrolComplianceQueryDto,
    actor: AuthUser,
  ): Promise<{ from: string; to: string; rows: ComplianceRow[] }> {
    const { from, to } = this.range(query);
    const scope = this.resolveScope(actor, query.barangayId);

    const assignments = await this.prisma.patrolAssignment.findMany({
      where: {
        scheduledAt: { gte: from, lte: to },
        ...(scope ? { patrolSchedule: { barangayId: scope } } : {}),
      },
      select: {
        tanodId: true,
        tanod: { select: { fullName: true, username: true } },
        sessions: { select: { status: true, endedAt: true } },
      },
    });

    const rows = new Map<string, ComplianceRow>();
    for (const a of assignments) {
      const entry =
        rows.get(a.tanodId) ??
        ({
          tanodId: a.tanodId,
          fullName: a.tanod.fullName,
          username: a.tanod.username,
          assigned: 0,
          completed: 0,
          sessions: 0,
          validScans: 0,
          complianceRate: 0,
        } satisfies ComplianceRow);
      entry.assigned += 1;
      entry.sessions += a.sessions.length;
      if (a.sessions.some((s) => s.status === PatrolStatus.COMPLETED || s.endedAt)) {
        entry.completed += 1;
      }
      rows.set(a.tanodId, entry);
    }

    if (rows.size > 0) {
      const scans = await this.prisma.checkpointScan.groupBy({
        by: ['tanodId'],
        where: {
          result: ScanResult.VALID,
          scannedAt: { gte: from, lte: to },
          tanodId: { in: [...rows.keys()] },
        },
        _count: { _all: true },
      });
      for (const scan of scans) {
        const entry = rows.get(scan.tanodId);
        if (entry) entry.validScans = scan._count._all;
      }
    }

    for (const entry of rows.values()) {
      entry.complianceRate =
        entry.assigned > 0 ? Math.round((entry.completed / entry.assigned) * 100) : 0;
    }

    const list = [...rows.values()].sort((a, b) => b.complianceRate - a.complianceRate);
    return { from: from.toISOString(), to: to.toISOString(), rows: list };
  }

  async patrolComplianceCsv(query: PatrolComplianceQueryDto, actor: AuthUser): Promise<string> {
    const { rows } = await this.patrolCompliance(query, actor);
    const header = 'Tanod,Username,Assigned,Completed,Sessions,ValidScans,ComplianceRate(%)';
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [escape(r.fullName), escape(r.username), r.assigned, r.completed, r.sessions, r.validScans, r.complianceRate].join(','),
    );
    return [header, ...lines].join('\n');
  }
}
