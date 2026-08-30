import { Module } from '@nestjs/common';
import { BarangaysService } from './barangays.service';
import { BarangaysController } from './barangays.controller';

@Module({
  controllers: [BarangaysController],
  providers: [BarangaysService],
  exports: [BarangaysService],
})
export class BarangaysModule {}
