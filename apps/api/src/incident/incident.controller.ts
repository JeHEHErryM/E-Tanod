import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../auth/auth-user.interface';
import { IncidentService } from './incident.service';
import { CreateIncidentDto, UpdateIncidentStatusDto, ListIncidentQueryDto } from './dto/incident.dto';

@Controller('incidents')
export class IncidentController {
  constructor(private readonly incidents: IncidentService) {}

  @Get('categories')
  @Permissions('incident.read', 'incident.report', 'resident.report')
  categories() {
    return this.incidents.categories();
  }

  @Get()
  @Permissions('incident.read', 'incident.review')
  list(@Query() query: ListIncidentQueryDto, @CurrentUser() actor: AuthUser) {
    return this.incidents.list(
      {
        page: query.page,
        pageSize: query.pageSize,
        barangayId: query.barangayId,
        status: query.status,
        categoryId: query.categoryId,
      },
      actor,
    );
  }

  @Get('mine')
  @Permissions('resident.track', 'incident.read')
  mine(@Query() query: ListIncidentQueryDto, @CurrentUser() actor: AuthUser) {
    return this.incidents.mine(actor.id, query.page, query.pageSize);
  }

  @Get(':id')
  @Permissions('incident.read', 'incident.review', 'resident.track')
  getOne(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.incidents.getOne(id, actor);
  }

  @Post()
  @Permissions('incident.report', 'resident.report')
  create(@Body() dto: CreateIncidentDto, @CurrentUser() actor: AuthUser) {
    return this.incidents.create(dto, {
      id: actor.id,
      username: actor.username,
      primaryRole: actor.primaryRole,
      barangayId: actor.barangayId,
    });
  }

  @Post(':id/attachments')
  @UseInterceptors(
    FileInterceptor('files', {
      limits: { fileSize: 10 * 1024 * 1024, files: 5 },
    }),
  )
  @Permissions('incident.read', 'incident.review', 'resident.track')
  addAttachments(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() actor: AuthUser,
  ) {
    return this.incidents.addAttachments(id, files ?? [], {
      id: actor.id,
      username: actor.username,
      primaryRole: actor.primaryRole,
      barangayId: actor.barangayId,
    });
  }

  @Patch(':id/status')
  @Permissions('incident.review')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.incidents.updateStatus(id, dto, actor);
  }
}