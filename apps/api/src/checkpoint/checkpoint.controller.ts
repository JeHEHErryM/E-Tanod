import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../auth/auth-user.interface';
import { CheckpointService } from './checkpoint.service';
import {
  CreateCheckpointDto,
  UpdateCheckpointDto,
  ScanCheckpointDto,
} from './dto/checkpoint.dto';

@Controller('checkpoints')
export class CheckpointController {
  constructor(private readonly checkpoints: CheckpointService) {}

  @Get()
  @Permissions('checkpoint.read', 'checkpoint.manage')
  list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('barangayId') barangayId?: string,
    @Query('status') status?: string,
  ) {
    return this.checkpoints.list({
      page: parseInt(page, 10) || 1,
      pageSize: Math.min(parseInt(pageSize, 10) || 20, 100),
      barangayId,
      status,
    });
  }

  @Get(':id')
  @Permissions('checkpoint.read', 'checkpoint.manage')
  getOne(@Param('id') id: string) {
    return this.checkpoints.getOne(id);
  }

  @Post()
  @Permissions('checkpoint.manage')
  create(@Body() dto: CreateCheckpointDto, @CurrentUser() actor: AuthUser) {
    return this.checkpoints.create(dto, actor.id);
  }

  @Patch(':id')
  @Permissions('checkpoint.manage')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCheckpointDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.checkpoints.update(id, dto, actor.id);
  }

  @Delete(':id')
  @Permissions('checkpoint.manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.checkpoints.remove(id, actor.id);
  }

  @Post(':id/qr/regenerate')
  @Permissions('checkpoint.manage')
  regenerateQr(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.checkpoints.regenerateQr(id, actor.id);
  }

  @Post('scan')
  @Permissions('checkpoint.scan')
  scan(@Body() dto: ScanCheckpointDto, @CurrentUser() actor: AuthUser) {
    return this.checkpoints.scan(dto, actor.id);
  }
}
