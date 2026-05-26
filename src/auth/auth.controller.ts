import { Body, Controller, Post, Get, Request, UseGuards } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Patch } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) { }

	// 注册：防止批量注册
	// 【开发：100 次/分】生产建议：5
	@ApiOperation({ summary: '用户注册' })
	@Throttle({ strict: { ttl: 60000, limit: 100 } })
	@Post('register')
	register(@Body() dto: RegisterDto) {
		return this.authService.register(dto);
	}

	// 登录：防止暴力破解
	// 【开发：100 次/分】生产建议：5
	@ApiOperation({ summary: '用户登录' })
	@Throttle({ strict: { ttl: 60000, limit: 100 } })
	@Post('login')
	login(@Body() dto: LoginDto) {
		return this.authService.login(dto);
	}

	// /auth/me 高频调用（每次页面加载），跳过限流
	@ApiBearerAuth()
	@ApiOperation({ summary: '获取当前登录用户信息' })
	@SkipThrottle()
	@UseGuards(JwtAuthGuard)
	@Get('me')
	getMe(@Request() req: { user: { id: number } }) {
		return this.authService.getMe(req.user.id);
	}

	// 发送验证码：防止邮件轰炸
	// 【开发：100 次/分】生产建议：3
	@ApiOperation({ summary: '发送密码重置验证码' })
	@Throttle({ strict: { ttl: 60000, limit: 100 } })
	@Post('forgot-password')
	forgotPassword(@Body() dto: ForgotPasswordDto) {
		return this.authService.forgotPassword(dto);
	}

	// 验证验证码
	// 【开发：100 次/分】生产建议：10
	@ApiOperation({ summary: '校验密码重置验证码' })
	@Throttle({ strict: { ttl: 60000, limit: 100 } })
	@Post('verify-reset-code')
	verifyResetCode(@Body() body: { email: string; code: string }) {
		return this.authService.verifyResetCode(body.email, body.code);
	}

	// 重置密码
	// 【开发：100 次/分】生产建议：5
	@ApiOperation({ summary: '重置密码' })
	@Throttle({ strict: { ttl: 60000, limit: 100 } })
	@Post('reset-password')
	resetPassword(@Body() dto: ResetPasswordDto) {
		return this.authService.resetPassword(dto);
	}

	@ApiBearerAuth()
	@ApiOperation({ summary: '更新用户资料' })
	@UseGuards(JwtAuthGuard)
	@Patch('profile')
	updateProfile(@Request() req: { user: { id: number } }, @Body() dto: UpdateProfileDto) {
		return this.authService.updateProfile(req.user.id, dto);
	}
}