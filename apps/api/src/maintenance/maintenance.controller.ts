import { Controller, Delete } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../auth/auth-user.interface';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Delete('checkpoint-scans')
  @Permissions('system.config')
  clearCheckpointScans(@CurrentUser() actor: AuthUser) {
    return this.maintenance.clearCheckpointScans(actor.id);
  }
}
