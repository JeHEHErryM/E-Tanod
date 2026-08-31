import { Module } from '@nestjs/common';
import { PatrolService } from './patrol.service';
import { PatrolController } from './patrol.controller';
import { AuditModule } from '../audit/audit.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [AuditModule, SocketModule],
  controllers: [PatrolController],
  providers: [PatrolService],
  exports: [PatrolService],
})
export class PatrolModule {}
