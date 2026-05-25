import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  // 使用环境变量配置，避免硬编码账号密码
  // 在 back_end/.env 中添加：
  //   MAIL_HOST=smtp.qq.com
  //   MAIL_PORT=465
  //   MAIL_USER=你的邮箱@qq.com
  //   MAIL_PASS=你的授权码（不是登录密码）
  //   MAIL_FROM="English Explosion <你的邮箱@qq.com>"
  private transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.qq.com',
    port: Number(process.env.MAIL_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  async sendResetCode(toEmail: string, code: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'English Explosion',
        to: toEmail,
        subject: 'Your Password Reset Code - English Explosion',
        html: `
          <div style="font-family: serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f0e8d5; border-radius: 16px; border: 2px solid #c2a36d;">
            <h2 style="color: #1c452c; text-align: center; font-size: 24px; margin-bottom: 8px;">
              🌿 English Explosion
            </h2>
            <h3 style="color: #3a2818; text-align: center; margin-bottom: 24px;">
              Password Reset Request
            </h3>
            <p style="color: #5c3d2e; font-size: 15px; line-height: 1.6;">
              We received a request to reset your password. Use the verification code below:
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <span style="display: inline-block; background: #1c452c; color: #e8dcb8; font-size: 36px; font-weight: bold; letter-spacing: 12px; padding: 16px 32px; border-radius: 12px;">
                ${code}
              </span>
            </div>
            <p style="color: #8c7355; font-size: 13px; text-align: center;">
              This code expires in <strong>10 minutes</strong>.<br/>
              If you did not request this, please ignore this email.
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error('Mail send error:', err);
      throw new InternalServerErrorException('Failed to send verification email');
    }
  }
}