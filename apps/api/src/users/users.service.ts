import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth-user.interface';
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

  async create(dto: CreateUserDto, actor: AuthUser) {
    this.assertActorCanGrant(actor, dto.roles, dto.primaryRole);

    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existing) throw new BadRequestException('Username already exists');

    // Barangay admins may only provision accounts inside their own barangay.
    const barangayId =
      actor.primaryRole === 'SUPER_ADMIN'
        ? (dto.barangayId ?? null)
        : (dto.barangayId ?? actor.barangayId);
    if (actor.primaryRole !== 'SUPER_ADMIN' && barangayId !== actor.barangayId) {
      throw new ForbiddenException('Cannot create users outside your barangay');
    }
    if (actor.primaryRole !== 'SUPER_ADMIN' && !barangayId) {
      throw new BadRequestException('Your account is not assigned to a barangay');
    }

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
        barangayId,
        // Admin-created accounts still require a verification/approval step.
        isActive: false,
        isVerified: false,
        primaryRoleId,
        roles: {
          create: roleIds.map((roleId) => ({ roleId })),
        },
        profile: {
          create: { contactNumber: dto.phone, escooter: false, barangayId },
        },
      },
      include: userInclude,
    });

    await this.audit.log(actor.id, 'USER_CREATED', 'user', user.id, {
      username: user.username,
      roles: dto.roles,
    });

    return this.toDto(user);
  }

  async findAll(params: { page: number; pageSize: number; role?: Role; search?: string; barangayId?: string; isActive?: boolean }, actor?: AuthUser) {
    const where: Prisma.UserWhereInput = {};
    if (actor && actor.primaryRole !== 'SUPER_ADMIN') {
      // Tenant isolation: barangay admins only see users of their own barangay.
      where.barangayId = actor.barangayId ?? '__none__';
    }
    if (params.role) where.roles = { some: { role: { name: params.role } } };
    if (params.isActive !== undefined) where.isActive = params.isActive;
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

  async findOne(id: string, actor?: AuthUser) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: userInclude });
    if (!user) throw new NotFoundException('User not found');
    if (actor && actor.primaryRole !== 'SUPER_ADMIN' && user.barangayId !== actor.barangayId) {
      throw new ForbiddenException('User is outside your barangay');
    }
    return this.toDto(user);
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } }, profile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (actor.primaryRole !== 'SUPER_ADMIN' && user.barangayId !== actor.barangayId) {
      throw new ForbiddenException('User is outside your barangay');
    }
    if (
      actor.primaryRole !== 'SUPER_ADMIN' &&
      dto.barangayId !== undefined &&
      dto.barangayId !== actor.barangayId
    ) {
      throw new ForbiddenException('Cannot move users across barangays');
    }

    if (
      actor.primaryRole !== 'SUPER_ADMIN' &&
      (dto.isActive !== undefined || dto.isVerified !== undefined)
    ) {
      const privileged = user.roles.some(
        (r) => r.role.name === 'SUPER_ADMIN' || r.role.name === 'BARANGAY_ADMIN',
      );
      if (privileged) {
        throw new ForbiddenException('Cannot change approval status of privileged accounts');
      }
    }

    const currentRoles = user.roles.map((r) => r.role.name);
    const targetRoles = dto.roles ?? currentRoles;
    if (dto.primaryRole && !targetRoles.includes(dto.primaryRole)) {
      throw new BadRequestException('Primary role must be one of the user roles');
    }
    this.assertActorCanGrant(actor, targetRoles, dto.primaryRole ?? targetRoles[0]);

    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isVerified !== undefined) data.isVerified = dto.isVerified;
    if (dto.barangayId !== undefined) data.barangay = { connect: { id: dto.barangayId } };
    if (dto.password) data.passwordHash = await argon2.hash(dto.password);
    if (dto.primaryRole) {
      const [primaryRoleId] = await this.resolveRoleIds([dto.primaryRole]);
      data.primaryRoleId = primaryRoleId;
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.roles) {
        const roleIds = await this.resolveRoleIds(dto.roles, tx);
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) });
      }
      if (Object.keys(data).length > 0) {
        await tx.user.update({ where: { id }, data });
      }
    });

    if (dto.roles || dto.primaryRole) {
      await this.audit.log(actor.id, 'ROLE_CHANGED', 'user', id, {
        roles: dto.roles,
        primaryRole: dto.primaryRole,
      });
    }

    if (dto.isActive === true && !user.isActive) {
      await this.audit.log(actor.id, 'USER_APPROVED', 'user', id, { username: user.username });
    } else if (dto.isActive === false && user.isActive) {
      await this.audit.log(actor.id, 'USER_DEACTIVATED', 'user', id, { username: user.username });
    }

    if (dto.barangayId !== undefined && dto.barangayId !== user.barangayId) {
      await this.audit.log(actor.id, 'USER_UPDATED', 'user', id, {
        barangayId: { from: user.barangayId, to: dto.barangayId },
      });
    }

    const updated = await this.prisma.user.findUnique({ where: { id }, include: userInclude });
    return this.toDto(updated!);
  }

  async remove(id: string, actor: AuthUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (actor.primaryRole !== 'SUPER_ADMIN' && user.barangayId !== actor.barangayId) {
      throw new ForbiddenException('User is outside your barangay');
    }

    // Pending (never-approved) accounts can be hard-deleted safely — they have
    // no assignments, sessions, or incident data attached yet.
    if (!user.isActive) {
      await this.prisma.user.delete({ where: { id } });
      await this.audit.log(actor.id, 'ACCOUNT_REJECTED', 'user', id, { username: user.username });
      return { success: true };
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false, isVerified: false },
    });

    await this.audit.log(actor.id, 'USER_DEACTIVATED', 'user', id, { username: user.username });
    return { success: true };
  }

  /**
   * Role-grant authority: only a SUPER_ADMIN may grant/manage SUPER_ADMIN or
   * BARANGAY_ADMIN. Barangay admins may only provision field + resident roles.
   */
  private assertActorCanGrant(actor: AuthUser, roles: Role[], primaryRole: Role) {
    const requested = new Set([...roles, primaryRole]);
    if (actor.primaryRole === 'SUPER_ADMIN') return;
    const allowed = new Set<Role>(['TANOD', 'RESIDENT']);
    const denied = [...requested].filter((r) => !allowed.has(r));
    if (denied.length > 0) {
      throw new ForbiddenException(`You may not manage the following roles: ${denied.join(', ')}`);
    }
  }

  private async resolveRoleIds(roles: Role[], client: Prisma.TransactionClient | PrismaService = this.prisma): Promise<string[]> {
    const records = await client.roleRecord.findMany({
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
