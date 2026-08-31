import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_PERMISSIONS, type Permission } from '../permissions';
import { PERMISSIONS_KEY } from '../decorators/roles.decorator';

interface RequestUser {
  id: string;
  roles: string[];
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser;
    if (!user) throw new ForbiddenException('Forbidden');

    const userPermissions = new Set<Permission>();
    for (const role of user.roles) {
      const perms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
      if (perms) perms.forEach((p) => userPermissions.add(p));
    }

    const allowed = required.some((p) => userPermissions.has(p));
    if (!allowed) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
