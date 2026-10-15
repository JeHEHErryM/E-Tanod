import { IsDateString, IsOptional, IsString } from 'class-validator';

export class PatrolComplianceQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  barangayId?: string;
}
