import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('me')
  getMyProgress(@Request() req: { user: { id: number } }) {
    return this.progressService.getMyProgress(req.user.id);
  }

  // 主页卡片用：返回所有材料的进度 map
  @Get('materials')
  getMaterialsProgress(@Request() req: { user: { id: number } }) {
    return this.progressService.getMaterialsProgress(req.user.id);
  }
}