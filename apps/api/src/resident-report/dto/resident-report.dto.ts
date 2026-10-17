import { Type } from 'class-transformer';
import { IncidentStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateResidentReportDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  barangayId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

export class UpdateResidentReportStatusDto {
  @IsEnum(IncidentStatus)
  status!: IncidentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
