import { Module } from '@nestjs/common';
import { ResidentReportService } from './resident-report.service';
import { ResidentReportController } from './resident-report.controller';

@Module({
  controllers: [ResidentReportController],
  providers: [ResidentReportService],
  exports: [ResidentReportService],
})
export class ResidentReportModule {}
