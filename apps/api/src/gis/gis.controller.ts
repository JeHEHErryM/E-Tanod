import { Controller, Get, Query } from '@nestjs/common';
import { Permissions } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { GisService } from './gis.service';
import { GisQueryDto } from './dto/gis.dto';

@Controller('gis')
export class GisController {
  constructor(private readonly gis: GisService) {}

  @Get('heatmap')
  @Permissions('gis.view')
  heatmap(@Query() query: GisQueryDto, @CurrentUser() actor: AuthUser) {
    return this.gis.heatmap(query, actor);
  }

  @Get('incidents')
  @Permissions('gis.view')
  incidents(@Query() query: GisQueryDto, @CurrentUser() actor: AuthUser) {
    return this.gis.incidents(query, actor);
  }
}