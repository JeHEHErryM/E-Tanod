import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBarangayDto, UpdateBarangayDto } from './dto/barangay.dto';

@Injectable()
export class BarangaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll() {
    return this.prisma.barangay.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const barangay = await this.prisma.barangay.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, checkpoints: true, incidents: true, patrolSchedules: true } },
      },
    });
    if (!barangay) throw new NotFoundException('Barangay not found');
    return barangay;
  }

  async create(dto: CreateBarangayDto, actorId: string) {
    const barangay = await this.prisma.barangay.create({ data: dto });
    await this.audit.log(actorId, 'ADMIN_ACTION', 'barangay', barangay.id, { name: barangay.name });
    return barangay;
  }

  async update(id: string, dto: UpdateBarangayDto, actorId: string) {
    await this.findOne(id);
    const barangay = await this.prisma.barangay.update({ where: { id }, data: dto });
    await this.audit.log(actorId, 'ADMIN_ACTION', 'barangay', id, { name: barangay.name });
    return barangay;
  }
}
