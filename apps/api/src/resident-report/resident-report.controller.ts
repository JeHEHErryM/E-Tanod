import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Permissions, Public } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.interface';
import { ResidentReportService } from './resident-report.service';
import {
  CreateResidentReportDto,
  UpdateResidentReportStatusDto,
} from './dto/resident-report.dto';

@Controller('resident-reports')
export class ResidentReportController {
  constructor(private readonly reports: ResidentReportService) {}

  @Post()
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Body() dto: CreateResidentReportDto) {
    return this.reports.create(dto);
  }

  @Get()
  @Permissions('resident.manage')
  list(
    @CurrentUser() actor: AuthUser,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.reports.list(
      {
        status,
        page: parseInt(page, 10) || 1,
        pageSize: Math.min(parseInt(pageSize, 10) || 20, 100),
      },
      actor,
    );
  }

  @Patch(':id/status')
  @Permissions('resident.manage')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateResidentReportStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.reports.updateStatus(id, dto, actor);
  }

  @Delete(':id')
  @Permissions('resident.manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.reports.remove(id, actor);
  }

  @Get(':trackingCode')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  track(@Param('trackingCode') trackingCode: string) {
    return this.reports.track(trackingCode);
  }
}
