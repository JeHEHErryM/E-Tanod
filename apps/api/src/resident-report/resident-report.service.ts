import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { IncidentSeverity, IncidentSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateResidentReportDto } from './dto/resident-report.dto';

@Injectable()
export class ResidentReportService {
  constructor(private readonly prisma: PrismaService) {}

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

    return {
      id: report.id,
      trackingCode,
      status: incident.status,
      createdAt: report.createdAt,
    };
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
