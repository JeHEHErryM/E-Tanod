import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CheckpointStatus } from '@prisma/client';

export class CreateCheckpointDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(500)
  radiusMeters?: number;

  @IsString()
  @IsNotEmpty()
  barangayId!: string;
}

export class UpdateCheckpointDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(500)
  radiusMeters?: number;

  @IsOptional()
  @IsEnum(CheckpointStatus)
  status?: CheckpointStatus;
}

export class ScanCheckpointDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  accuracy?: number;
}

export class RegenerateQrDto {
  @IsInt()
  @IsOptional()
  hours?: number;
}
