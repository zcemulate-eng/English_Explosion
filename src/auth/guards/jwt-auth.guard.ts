import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// 使用时只需在 Controller 方法上加 @UseGuards(JwtAuthGuard)
// 未携带有效 Token 的请求会自动返回 401
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}