import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { BarangaysService } from './barangays.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/roles.decorator';
import { CreateBarangayDto, UpdateBarangayDto } from './dto/barangay.dto';
import type { AuthUser } from '../auth/auth-user.interface';

@Controller('barangays')
export class BarangaysController {
  constructor(private readonly barangays: BarangaysService) {}

  @Get()
  @Permissions('barangay.read')
  findAll() {
    return this.barangays.findAll();
  }

  @Get(':id')
  @Permissions('barangay.read')
  findOne(@Param('id') id: string) {
    return this.barangays.findOne(id);
  }

  @Post()
  @Permissions('barangay.manage')
  create(@Body() dto: CreateBarangayDto, @CurrentUser() actor: AuthUser) {
    return this.barangays.create(dto, actor.id);
  }

  @Patch(':id')
  @Permissions('barangay.manage')
  update(@Param('id') id: string, @Body() dto: UpdateBarangayDto, @CurrentUser() actor: AuthUser) {
    return this.barangays.update(id, dto, actor.id);
  }
}
