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
import { IncidentService } from './incident.service';
import { CreateIncidentDto, UpdateIncidentStatusDto, ListIncidentQueryDto } from './dto/incident.dto';

@Controller('incidents')
export class IncidentController {
  constructor(private readonly incidents: IncidentService) {}

  @Get('categories')
  @Permissions('incident.read', 'incident.report')
  categories() {
    return this.incidents.categories();
  }

  @Get()
  @Permissions('incident.read', 'incident.review')
  list(@Query() query: ListIncidentQueryDto) {
    return this.incidents.list({
      page: query.page,
      pageSize: query.pageSize,
      barangayId: query.barangayId,
      status: query.status,
      categoryId: query.categoryId,
    });
  }

  @Get(':id')
  @Permissions('incident.read', 'incident.review')
  getOne(@Param('id') id: string) {
    return this.incidents.getOne(id);
  }

  @Post()
  @Permissions('incident.report')
  create(@Body() dto: CreateIncidentDto, @CurrentUser() actor: AuthUser) {
    return this.incidents.create(dto, { id: actor.id, username: actor.username });
  }

  @Patch(':id/status')
  @Permissions('incident.review')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.incidents.updateStatus(id, dto, actor.id);
  }
}
