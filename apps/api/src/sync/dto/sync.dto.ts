import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export const SYNC_ENTITY_TYPES = ['CHECKPOINT_SCAN', 'INCIDENT', 'PATROL_LOCATION'] as const;
export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];

export class SyncRecordDto {
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  operation!: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class SyncBatchDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SyncRecordDto)
  records!: SyncRecordDto[];
}
