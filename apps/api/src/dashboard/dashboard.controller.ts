import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Permissions } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @Permissions('patrol.monitor')
  getStats(@CurrentUser() actor: AuthUser) {
    return this.dashboard.getStats(actor);
  }
}
