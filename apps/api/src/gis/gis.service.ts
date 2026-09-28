import { Injectable } from '@nestjs/common';
import { IncidentSeverity, IncidentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GisQueryDto } from './dto/gis.dto';

const SEVERITY_WEIGHT: Record<IncidentSeverity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

@Injectable()
export class GisService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: GisQueryDto): Prisma.IncidentWhereInput {
    const where: Prisma.IncidentWhereInput = {
      latitude: { not: null },
      longitude: { not: null },
    };
    if (query.barangayId) where.barangayId = query.barangayId;
    if (query.status) {
      const statuses = query.status
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s): s is IncidentStatus => s in IncidentStatus);
      if (statuses.length) where.status = { in: statuses };
    }
    if (query.from || query.to) {
      where.reportedAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    return where;
  }

  /** Weighted points for a Mapbox heatmap layer. */
  async heatmap(query: GisQueryDto) {
    const where = this.buildWhere(query);
    const data = await this.prisma.incident.findMany({
      where,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        severity: true,
        reportedAt: true,
      },
      orderBy: { reportedAt: 'desc' },
      take: Math.min(query.maxPoints ?? 5000, 20000),
    });

    return {
      data: data.map(({ id, latitude, longitude, severity, reportedAt }) => ({
        id,
        latitude,
        longitude,
        weight: SEVERITY_WEIGHT[severity],
        severity,
        reportedAt,
      })),
      count: data.length,
    };
  }

  /** Incident markers for the map. */
  async incidents(query: GisQueryDto) {
    const where = this.buildWhere(query);
    const data = await this.prisma.incident.findMany({
      where,
      select: {
        id: true,
        code: true,
        latitude: true,
        longitude: true,
        severity: true,
        status: true,
        isAnonymous: true,
        source: true,
        reportedAt: true,
        category: { select: { id: true, name: true, code: true } },
        barangay: { select: { id: true, name: true } },
      },
      orderBy: { reportedAt: 'desc' },
      take: Math.min(query.maxPoints ?? 5000, 20000),
    });

    return { data, count: data.length };
  }
}