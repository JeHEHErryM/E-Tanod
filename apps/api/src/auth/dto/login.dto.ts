import { IsString, MinLength, MaxLength, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  barangayId?: string;
}
