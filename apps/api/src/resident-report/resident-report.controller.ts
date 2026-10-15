import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/roles.decorator';
import { ResidentReportService } from './resident-report.service';
import { CreateResidentReportDto } from './dto/resident-report.dto';

@Controller('resident-reports')
export class ResidentReportController {
  constructor(private readonly reports: ResidentReportService) {}

  @Post()
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Body() dto: CreateResidentReportDto) {
    return this.reports.create(dto);
  }

  @Get(':trackingCode')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  track(@Param('trackingCode') trackingCode: string) {
    return this.reports.track(trackingCode);
  }
}
