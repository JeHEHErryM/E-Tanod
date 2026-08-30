import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const userInclude = {
  profile: true,
  roles: { include: { role: true } },
  barangay: { select: { id: true, name: true, code: true } },
} satisfies Prisma.UserInclude;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existing) throw new BadRequestException('Username already exists');

    const roleIds = await this.resolveRoleIds(dto.roles);
    const primaryRoleId = (await this.resolveRoleIds([dto.primaryRole]))[0];

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        barangayId: dto.barangayId,
        primaryRoleId,
        roles: {
          create: roleIds.map((roleId) => ({ roleId })),
        },
        profile: {
          create: { contactNumber: dto.phone, escooter: false },
        },
      },
      include: userInclude,
    });

    await this.audit.log(actorId, 'USER_CREATED', 'user', user.id, {
      username: user.username,
      roles: dto.roles,
    });

    return this.toDto(user);
  }

  async findAll(params: { page: number; pageSize: number; role?: Role; search?: string; barangayId?: string }) {
    const where: Prisma.UserWhereInput = {};
    if (params.role) where.roles = { some: { role: { name: params.role } } };
    if (params.search) {
      where.OR = [
        { username: { contains: params.search, mode: 'insensitive' } },
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.barangayId) where.barangayId = params.barangayId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: userInclude,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: data.map((u) => this.toDto(u)), total, page: params.page, pageSize: params.pageSize };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: userInclude });
    if (!user) throw new NotFoundException('User not found');
    return this.toDto(user);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { roles: true } });
    if (!user) throw new NotFoundException('User not found');

    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isVerified !== undefined) data.isVerified = dto.isVerified;
    if (dto.barangayId !== undefined) data.barangay = { connect: { id: dto.barangayId } };
    if (dto.password) data.passwordHash = await argon2.hash(dto.password);

    if (dto.roles) {
      const roleIds = await this.resolveRoleIds(dto.roles);
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      await this.prisma.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) });
    }
    if (dto.primaryRole) {
      const primaryRoleId = (await this.resolveRoleIds([dto.primaryRole]))[0];
      data.primaryRoleId = primaryRoleId;
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.user.update({ where: { id }, data });
    }

    if (dto.roles || dto.primaryRole) {
      await this.audit.log(actorId, 'ROLE_CHANGED', 'user', id, {
        roles: dto.roles,
        primaryRole: dto.primaryRole,
      });
    }

    const updated = await this.prisma.user.findUnique({ where: { id }, include: userInclude });
    return this.toDto(updated!);
  }

  async remove(id: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log(actorId, 'USER_CREATED', 'user', id, { action: 'deactivated' });
    return { success: true };
  }

  private async resolveRoleIds(roles: Role[]): Promise<string[]> {
    const records = await this.prisma.roleRecord.findMany({
      where: { name: { in: roles } },
    });
    const found = new Set(records.map((r) => r.name));
    for (const r of roles) {
      if (!found.has(r)) throw new BadRequestException(`Role not found: ${r}`);
    }
    return records.map((r) => r.id);
  }

  private toDto(user: Prisma.UserGetPayload<{ include: typeof userInclude }>) {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      isVerified: user.isVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      roles: user.roles.map((r) => r.role.name),
      primaryRole: user.roles.find((r) => r.roleId === user.primaryRoleId)?.role.name ?? user.roles[0]?.role.name ?? null,
      barangay: user.barangay,
    };
  }
}
