import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './auth-user.interface';

export interface JwtPayload {
  sub: string;
  username: string;
  roles: string[];
  primaryRole: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: { include: { role: true } },
        profile: true,
      },
    });

    if (!user) throw new UnauthorizedException('User not found');
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    const roles = user.roles.map((r) => r.role.name);
    const primaryRole = (user.roles.find((r) => r.roleId === user.primaryRoleId)?.role.name ??
      roles[0]) as AuthUser['primaryRole'];

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      primaryRole,
      roles: roles as AuthUser['roles'],
      barangayId: user.barangayId,
      isActive: user.isActive,
      isVerified: user.isVerified,
    };
  }
}
