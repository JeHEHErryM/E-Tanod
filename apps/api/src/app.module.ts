import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BarangaysModule } from './barangays/barangays.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SocketModule } from './socket/socket.module';
import { PatrolModule } from './patrol/patrol.module';
import { CheckpointModule } from './checkpoint/checkpoint.module';
import { IncidentModule } from './incident/incident.module';
import { GisModule } from './gis/gis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    BarangaysModule,
    AuditModule,
    HealthModule,
    DashboardModule,
    SocketModule,
    PatrolModule,
    CheckpointModule,
    IncidentModule,
    GisModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
