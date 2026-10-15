import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { CheckpointModule } from '../checkpoint/checkpoint.module';
import { IncidentModule } from '../incident/incident.module';
import { PatrolModule } from '../patrol/patrol.module';

@Module({
  imports: [CheckpointModule, IncidentModule, PatrolModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
