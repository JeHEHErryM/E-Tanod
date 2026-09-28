import { Controller, Get, Query } from '@nestjs/common';
import { Permissions } from '../common/decorators/roles.decorator';
import { GisService } from './gis.service';
import { GisQueryDto } from './dto/gis.dto';

@Controller('gis')
export class GisController {
  constructor(private readonly gis: GisService) {}

  @Get('heatmap')
  @Permissions('gis.view')
  heatmap(@Query() query: GisQueryDto) {
    return this.gis.heatmap(query);
  }

  @Get('incidents')
  @Permissions('gis.view')
  incidents(@Query() query: GisQueryDto) {
    return this.gis.incidents(query);
  }
}