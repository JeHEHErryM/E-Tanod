import { Module } from '@nestjs/common';
import { ResidentReportService } from './resident-report.service';
import { ResidentReportController } from './resident-report.controller';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [SocketModule],
  controllers: [ResidentReportController],
  providers: [ResidentReportService],
  exports: [ResidentReportService],
})
export class ResidentReportModule {}
