import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../auth/auth-user.interface';
import { PatrolService } from './patrol.service';
import {
  CreatePatrolScheduleDto,
  UpdatePatrolScheduleDto,
  ListPatrolQueryDto,
  StartPatrolDto,
  ReportLocationDto,
} from './dto/patrol.dto';

@Controller('patrol')
export class PatrolController {
  constructor(private readonly patrol: PatrolService) {}

  @Get('schedules')
  @Permissions('patrol.manage', 'patrol.monitor')
  listSchedules(@Query() query: ListPatrolQueryDto) {
    return this.patrol.listSchedules({
      page: query.page,
      pageSize: query.pageSize,
      barangayId: query.barangayId,
      status: query.status,
    });
  }

  @Get('schedules/:id')
  @Permissions('patrol.manage', 'patrol.monitor')
  getSchedule(@Param('id') id: string) {
    return this.patrol.getSchedule(id);
  }

  @Post('schedules')
  @Permissions('patrol.manage', 'patrol.assign')
  createSchedule(@Body() dto: CreatePatrolScheduleDto, @CurrentUser() actor: AuthUser) {
    return this.patrol.createSchedule(dto, actor.id);
  }

  @Patch('schedules/:id')
  @Permissions('patrol.manage', 'patrol.assign')
  updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdatePatrolScheduleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.patrol.updateSchedule(id, dto, actor.id);
  }

  @Get('assignments')
  @Permissions('patrol.start', 'patrol.monitor')
  myAssignments(@CurrentUser() actor: AuthUser) {
    return this.patrol.getMyAssignments(actor.id);
  }

  @Get('session/active')
  @Permissions('patrol.start', 'patrol.monitor')
  activeSession(@CurrentUser() actor: AuthUser) {
    return this.patrol.getMyActiveSession(actor.id);
  }

  @Post('start')
  @Permissions('patrol.start')
  start(@Body() dto: StartPatrolDto, @CurrentUser() actor: AuthUser) {
    return this.patrol.startPatrol(dto, actor.id);
  }

  @Post('session/:id/end')
  @Permissions('patrol.end')
  end(
    @Param('id') id: string,
    @Body('notes') notes: string | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.patrol.endPatrol(id, notes, actor.id);
  }

  @Post('session/:id/location')
  @Permissions('patrol.start', 'patrol.end')
  location(
    @Param('id') id: string,
    @Body() dto: ReportLocationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.patrol.recordLocation(id, actor.id, dto.latitude, dto.longitude, dto.accuracy);
  }
}
