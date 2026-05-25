import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength, IsEnum } from 'class-validator';
import { Purpose } from '@prisma/client';

export class RegisterDto {
  // 基础邮件格式要求，包含 @ 和 .
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string; // ✅ 添加了 !

  // 密码：不少于6位，包含字母和数字
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: 'Password must contain both letters and numbers' })
  password!: string; // ✅ 添加了 !

  @IsString()
  @IsNotEmpty({ message: 'Nickname cannot be empty' })
  nickname!: string; // ✅ 添加了 !

  // 1 开头，11 位数字
  @IsOptional()
  @IsString()
  @Matches(/^1\d{10}$/, { message: 'Phone number must be an 11-digit number starting with 1' })
  phone?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsEnum(Purpose, { message: 'Invalid learning purpose' })
  purpose?: Purpose;
}