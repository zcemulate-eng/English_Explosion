import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Purpose } from '@prisma/client';

export class RegisterDto {
  // 基础邮件格式要求，包含 @ 和 .
  @ApiProperty({ example: 'user@example.com', description: '邮箱地址' })
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  // 密码：不少于6位，包含字母和数字
  @ApiProperty({ example: 'abc123', description: '密码，至少6位且包含字母和数字' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: 'Password must contain both letters and numbers' })
  password!: string;

  @ApiProperty({ example: 'Alice', description: '昵称' })
  @IsString()
  @IsNotEmpty({ message: 'Nickname cannot be empty' })
  nickname!: string;

  // 1 开头，11 位数字
  @ApiPropertyOptional({ example: '13800000000', description: '手机号，1开头的11位数字' })
  @IsOptional()
  @IsString()
  @Matches(/^1\d{10}$/, { message: 'Phone number must be an 11-digit number starting with 1' })
  phone?: string;

  @ApiPropertyOptional({ description: '头像 URL' })
  @IsOptional()
  @IsString()
  avatar_url?: string;

  @ApiPropertyOptional({ enum: Purpose, description: '学习目的' })
  @IsOptional()
  @IsEnum(Purpose, { message: 'Invalid learning purpose' })
  purpose?: Purpose;
}