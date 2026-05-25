import { IsEmail, IsNotEmpty, IsBoolean, IsOptional, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: '请输入正确的邮箱格式' })
  email!: string;

  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度不能少于6位' })
  password!: string;

  // Remember Me：true = 签发 7 天 token，false/不传 = 签发 1 天 token
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}