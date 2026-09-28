import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GisQueryDto {
  @IsOptional()
  @IsString()
  barangayId?: string;

  /** Comma-separated incident status filter, e.g. "VERIFIED,RESOLVED" */
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(200)
  @Max(20000)
  maxPoints?: number;
}