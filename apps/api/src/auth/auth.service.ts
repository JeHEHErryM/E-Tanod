import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from './auth-user.interface';
import { RegisterDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async validateUser(username: string, password: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { roles: { include: { role: true } }, profile: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const roles = user.roles.map((r) => r.role.name);
    const primaryRole = (user.roles.find((r) => r.roleId === user.primaryRoleId)?.role.name ??
      roles[0]) as AuthUser['primaryRole'];

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.toAuthUser(user.id, {
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      primaryRole,
      roles: roles as AuthUser['roles'],
      barangayId: user.barangayId,
      isActive: user.isActive,
      isVerified: user.isVerified,
    });
  }

  private toAuthUser(id: string, data: Omit<AuthUser, 'id'>): AuthUser {
    return { id, ...data };
  }

  async login(user: AuthUser, ip?: string, userAgent?: string) {
    const payload = {
      sub: user.id,
      username: user.username,
      roles: user.roles,
      primaryRole: user.primaryRole,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: refreshHash, expiresAt },
    });

    await this.audit.log(user.id, 'LOGIN', 'session', null, { ip, userAgent });

    return { accessToken, refreshToken, user };
  }

  async refresh(refreshToken: string) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash, revoked: false },
      include: { user: { include: { roles: { include: { role: true } } } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = stored.user;
    const roles = user.roles.map((r) => r.role.name);
    const primaryRole = (user.roles.find((r) => r.roleId === user.primaryRoleId)?.role.name ??
      roles[0]) as AuthUser['primaryRole'];

    const authUser = this.toAuthUser(user.id, {
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      primaryRole,
      roles: roles as AuthUser['roles'],
      barangayId: user.barangayId,
      isActive: user.isActive,
      isVerified: user.isVerified,
    });

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, username: user.username, roles: authUser.roles, primaryRole },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );

    return { accessToken, user: authUser };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: hash, userId },
        data: { revoked: true },
      });
    }
    await this.audit.log(userId, 'LOGOUT', 'session', null, null);
  }

  /**
   * Public account request flow. New accounts are created INACTIVE so an
   * admin can review and approve them (see UsersModule approvals).
   */
  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    const username = dto.username.trim();
    const fullName = dto.fullName.trim();
    const email = dto.email.trim().toLowerCase();
    const requestedRole = dto.role ?? Role.RESIDENT;

    if (requestedRole !== Role.RESIDENT && requestedRole !== Role.TANOD) {
      throw new BadRequestException('Role not allowed for self-registration');
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) throw new BadRequestException('Username or email is already registered');

    let barangayId: string | null = null;
    if (dto.barangayId) {
      const barangay = await this.prisma.barangay.findUnique({ where: { id: dto.barangayId } });
      if (!barangay) throw new BadRequestException('Barangay not found');
      barangayId = barangay.id;
    }

    const roleRecord = await this.prisma.roleRecord.findUnique({ where: { name: requestedRole } });
    if (!roleRecord) throw new BadRequestException('Role not found');

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash,
        fullName,
        email,
        phone: dto.phone,
        barangayId,
        isActive: false,
        isVerified: false,
        primaryRoleId: roleRecord.id,
        roles: { create: { roleId: roleRecord.id } },
        profile: { create: { contactNumber: dto.phone, escooter: false, barangayId } },
      },
    });

    await this.audit.log(
      user.id,
      'ACCOUNT_REGISTERED',
      'user',
      user.id,
      { username, fullName, role: requestedRole, barangayId },
      ip,
      userAgent,
    );

    return { success: true };
  }
}
