import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../auth/auth-user.interface';
import { SyncService } from './sync.service';
import { SyncBatchDto } from './dto/sync.dto';

@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post()
  @Permissions('sync.write')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  push(@Body() dto: SyncBatchDto, @CurrentUser() user: AuthUser) {
    return this.sync.push(dto.records, user);
  }

  @Get('status')
  @Permissions('sync.read')
  status(@CurrentUser() user: AuthUser) {
    return this.sync.status(user);
  }
}
