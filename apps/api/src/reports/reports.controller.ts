import { Controller, Get, Header, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../auth/auth-user.interface';
import { ReportsService } from './reports.service';
import { PatrolComplianceQueryDto } from './dto/reports.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('patrol-compliance')
  @Permissions('reports.view')
  patrolCompliance(@Query() query: PatrolComplianceQueryDto, @CurrentUser() actor: AuthUser) {
    return this.reports.patrolCompliance(query, actor);
  }

  @Get('patrol-compliance.csv')
  @Permissions('reports.view')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="patrol-compliance.csv"')
  async patrolComplianceCsv(
    @Query() query: PatrolComplianceQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.reports.patrolComplianceCsv(query, actor);
  }
}
