import { Body, Controller, Post, Get, Request, UseGuards } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Patch } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) { }

	// 注册：60秒内最多5次，防止批量注册
	@Throttle({ strict: { ttl: 60000, limit: 5 } })
	@Post('register')
	register(@Body() dto: RegisterDto) {
		return this.authService.register(dto);
	}

	// 登录：60秒内最多5次，防止暴力破解
	@Throttle({ strict: { ttl: 60000, limit: 5 } })
	@Post('login')
	login(@Body() dto: LoginDto) {
		return this.authService.login(dto);
	}

	// /auth/me 高频调用（每次页面加载），跳过限流
	@SkipThrottle()
	@UseGuards(JwtAuthGuard)
	@Get('me')
	getMe(@Request() req: { user: { id: number } }) {
		return this.authService.getMe(req.user.id);
	}

	// 发送验证码：60秒内最多3次，防止邮件轰炸
	@Throttle({ strict: { ttl: 60000, limit: 3 } })
	@Post('forgot-password')
	forgotPassword(@Body() dto: ForgotPasswordDto) {
		return this.authService.forgotPassword(dto);
	}

	// 验证验证码：60秒内最多10次
	@Throttle({ strict: { ttl: 60000, limit: 10 } })
	@Post('verify-reset-code')
	verifyResetCode(@Body() body: { email: string; code: string }) {
		return this.authService.verifyResetCode(body.email, body.code);
	}

	// 重置密码：60秒内最多5次
	@Throttle({ strict: { ttl: 60000, limit: 5 } })
	@Post('reset-password')
	resetPassword(@Body() dto: ResetPasswordDto) {
		return this.authService.resetPassword(dto);
	}

	@UseGuards(JwtAuthGuard)
	@Patch('profile')
	updateProfile(@Request() req: { user: { id: number } }, @Body() dto: UpdateProfileDto) {
		return this.authService.updateProfile(req.user.id, dto);
	}
}