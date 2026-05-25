// src/auth/dto/update-profile.dto.ts
import { IsString, IsOptional, Matches, IsEnum, MinLength, ValidateIf } from 'class-validator';
import { Purpose } from '@prisma/client';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  // 严格要求手机号为11位数字且以数字1开头
  @IsOptional()
  @Matches(/^1\d{10}$/, { message: 'Phone number must be an 11-digit string starting with 1' })
  phone?: string;

  @IsOptional()
  @IsEnum(Purpose)
  purpose?: Purpose;

  // 密码修改相关的二次验证
  @IsOptional()
  @IsString()
  @MinLength(6)
  oldPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;

  @ValidateIf(o => o.newPassword !== undefined)
  @IsString()
  confirmPassword?: string;
}