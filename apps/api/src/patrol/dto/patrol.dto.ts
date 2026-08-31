import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreatePatrolScheduleDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  barangayId!: string;

  @IsString()
  scheduledDate!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tanodIds?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScheduleCheckpointDto)
  checkpoints!: ScheduleCheckpointDto[];
}

export class ScheduleCheckpointDto {
  @IsString()
  checkpointId!: string;

  @IsInt()
  @Min(1)
  order!: number;
}

export class UpdatePatrolScheduleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  scheduledDate?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tanodIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleCheckpointDto)
  checkpoints?: ScheduleCheckpointDto[];
}

export class ListPatrolQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsString()
  barangayId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class StartPatrolDto {
  @IsString()
  patrolAssignmentId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class EndPatrolDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReportLocationDto {
  @Type(() => Number)
  latitude!: number;

  @Type(() => Number)
  longitude!: number;

  @IsOptional()
  @Type(() => Number)
  accuracy?: number;
}
