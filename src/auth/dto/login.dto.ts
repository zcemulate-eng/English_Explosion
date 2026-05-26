import { IsEmail, IsNotEmpty, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: '邮箱地址' })
  @IsEmail({}, { message: '请输入正确的邮箱格式' })
  email!: string;

  @ApiProperty({ example: 'abc123', description: '密码' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度不能少于6位' })
  password!: string;

  // Remember Me：true = 签发 7 天 token，false/不传 = 签发 1 天 token
  @ApiPropertyOptional({ example: true, description: '记住我：true 签发7天token，否则1天' })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}