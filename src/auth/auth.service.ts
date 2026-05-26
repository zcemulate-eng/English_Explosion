import {
	Injectable,
	UnauthorizedException,
	ConflictException,
	BadRequestException,
	NotFoundException,
	ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UpdateProfileDto } from './dto/update-profile.dto';

// ─── 登录锁定 / 验证码：常量 ────────────────────────────────────────────────
// 失败次数与验证码均已落库（LoginAttempt / ResetCode 表），重启不丢、多实例共享。

const MAX_FAIL = 5;                    // 最多失败次数
const LOCK_MS = 15 * 60 * 1000;      // 锁定时长：15 分钟
const RESET_CODE_MS = 10 * 60 * 1000; // 验证码有效期：10 分钟

@Injectable()
export class AuthService {
	constructor(
		private prisma: PrismaService,
		private jwtService: JwtService,
		private mailService: MailService,
	) { }

	async register(dto: RegisterDto) {
		const { email, password, nickname, phone, avatar_url, purpose } = dto;

		const existingEmail = await this.prisma.user.findUnique({ where: { email } });
		if (existingEmail) throw new ConflictException('This email is already registered');

		const existingNickname = await this.prisma.user.findFirst({ where: { nickname } });
		if (existingNickname) throw new ConflictException('This nickname is already taken');

		const hashedPassword = await bcrypt.hash(password, 10);
		const user = await this.prisma.user.create({
			data: { email, password_hash: hashedPassword, nickname, phone, avatar_url, purpose },
			select: { id: true, email: true, nickname: true, phone: true, purpose: true, created_at: true },
		});

		return { message: 'Registration successful', user };
	}

	async login(dto: LoginDto) {
		const { email, password, rememberMe } = dto;

		// ── 检查是否处于锁定状态 ────────────────────────────────────────────────
		const attempt = await this.prisma.loginAttempt.findUnique({ where: { email } });
		if (attempt?.locked_until && new Date() < attempt.locked_until) {
			const remainingMs = attempt.locked_until.getTime() - Date.now();
			const remainingMin = Math.ceil(remainingMs / 60000);
			throw new ForbiddenException(
				`Account temporarily locked. Please try again in ${remainingMin} minute${remainingMin > 1 ? 's' : ''}.`
			);
		}

		// ── 验证用户是否存在 ─────────────────────────────────────────────────────
		const user = await this.prisma.user.findUnique({ where: { email } });
		if (!user) {
			// 邮箱不存在不计入失败次数（防止枚举用户）
			throw new UnauthorizedException('Incorrect email or password.');
		}

		// ── 验证密码 ─────────────────────────────────────────────────────────────
		const isPasswordValid = await bcrypt.compare(password, user.password_hash);
		if (!isPasswordValid) {
			// 记录失败次数（落库）
			const newCount = (attempt?.fail_count ?? 0) + 1;

			if (newCount >= MAX_FAIL) {
				// 达到上限，锁定账户
				await this.prisma.loginAttempt.upsert({
					where: { email },
					create: { email, fail_count: newCount, locked_until: new Date(Date.now() + LOCK_MS) },
					update: { fail_count: newCount, locked_until: new Date(Date.now() + LOCK_MS) },
				});
				throw new ForbiddenException(
					`Too many failed attempts. Account locked for 15 minutes.`
				);
			} else {
				await this.prisma.loginAttempt.upsert({
					where: { email },
					create: { email, fail_count: newCount, locked_until: null },
					update: { fail_count: newCount, locked_until: null },
				});
				const remaining = MAX_FAIL - newCount;
				throw new UnauthorizedException(
					`Incorrect email or password. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`
				);
			}
		}

		// ── 登录成功：清除失败记录 ────────────────────────────────────────────────
		if (attempt) {
			await this.prisma.loginAttempt.delete({ where: { email } }).catch(() => undefined);
		}

		const payload = { sub: user.id, email: user.email, role: user.role };
		const expiresIn = rememberMe ? '7d' : '1d';
		const access_token = await this.jwtService.signAsync(payload, { expiresIn });
		const expiresAt = Date.now() + (rememberMe ? 7 : 1) * 24 * 60 * 60 * 1000;

		return {
			message: 'Login successful',
			access_token,
			expires_at: expiresAt,
			user: { id: user.id, email: user.email, nickname: user.nickname, avatar_url: user.avatar_url },
		};
	}

	async getMe(userId: number) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			// ✅ 在这里加上 phone: true
			select: { id: true, email: true, nickname: true, phone: true, avatar_url: true, purpose: true, role: true, created_at: true },
		});
		if (!user) throw new UnauthorizedException('User not found');
		return user;
	}

	// ── Step 1：发送验证码 ─────────────────────────────────────────────────────
	async forgotPassword(dto: ForgotPasswordDto) {
		const { email } = dto;
		const user = await this.prisma.user.findUnique({ where: { email } });

		if (!user) throw new NotFoundException('This email is not registered. Please check or create an account.');

		const code = Math.floor(100000 + Math.random() * 900000).toString();
		await this.prisma.resetCode.upsert({
			where: { email },
			create: { email, code, expires_at: new Date(Date.now() + RESET_CODE_MS) },
			update: { code, expires_at: new Date(Date.now() + RESET_CODE_MS) },
		});

		await this.mailService.sendResetCode(email, code);
		return { message: 'If this email is registered, a code has been sent.' };
	}

	// ── Step 2：验证验证码 ────────────────────────────────────────────────────
	async verifyResetCode(email: string, code: string) {
		const entry = await this.prisma.resetCode.findUnique({ where: { email } });
		if (!entry) throw new BadRequestException('No reset code found. Please request a new one.');
		if (new Date() > entry.expires_at) {
			await this.prisma.resetCode.delete({ where: { email } }).catch(() => undefined);
			throw new BadRequestException('Verification code has expired. Please request a new one.');
		}
		if (entry.code !== code) throw new BadRequestException('Incorrect verification code.');
		return { message: 'Code verified successfully.' };
	}

	// ── Step 3：重置密码 ──────────────────────────────────────────────────────
	async resetPassword(dto: ResetPasswordDto) {
		const { email, code, newPassword } = dto;

		const entry = await this.prisma.resetCode.findUnique({ where: { email } });
		if (!entry) throw new BadRequestException('No reset code found. Please request a new one.');
		if (new Date() > entry.expires_at) {
			await this.prisma.resetCode.delete({ where: { email } }).catch(() => undefined);
			throw new BadRequestException('Verification code has expired. Please request a new one.');
		}
		if (entry.code !== code) throw new BadRequestException('Incorrect verification code.');

		const user = await this.prisma.user.findUnique({ where: { email } });
		if (!user) throw new NotFoundException('User not found.');

		const hashedPassword = await bcrypt.hash(newPassword, 10);
		await this.prisma.user.update({ where: { email }, data: { password_hash: hashedPassword } });

		await this.prisma.resetCode.delete({ where: { email } }).catch(() => undefined); // 用完即删
		return { message: 'Password reset successfully. You can now log in.' };
	}

	async updateProfile(userId: number, dto: UpdateProfileDto) {
		const { avatar_url, nickname, phone, purpose, oldPassword, newPassword, confirmPassword } = dto;
		const dataToUpdate: any = {};

		if (avatar_url) dataToUpdate.avatar_url = avatar_url;
		if (nickname) dataToUpdate.nickname = nickname;
		if (phone) dataToUpdate.phone = phone;
		if (purpose) dataToUpdate.purpose = purpose;

		// 如果用户提交了新密码，则进行严格的双重验证
		if (newPassword) {
			if (newPassword !== confirmPassword) {
				throw new BadRequestException('New password and confirm password do not match');
			}
			if (!oldPassword) {
				throw new BadRequestException('Old password is required to set a new password');
			}

			const user = await this.prisma.user.findUnique({ where: { id: userId } });

			// ✅ 增加这里的判空校验
			if (!user) {
				throw new NotFoundException('User not found');
			}

			// 现在 TypeScript 知道 user 绝对不为空了，这里的报错就会消失
			const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
			if (!isPasswordValid) {
				throw new UnauthorizedException('Incorrect old password');
			}

			dataToUpdate.password_hash = await bcrypt.hash(newPassword, 10);
		}

		const updatedUser = await this.prisma.user.update({
			where: { id: userId },
			data: dataToUpdate,
			select: {
				id: true, email: true, nickname: true, phone: true,
				avatar_url: true, purpose: true, created_at: true
			},
		});

		return { message: 'Profile updated successfully', user: updatedUser };
	}
}