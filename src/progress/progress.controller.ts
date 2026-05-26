import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @ApiOperation({ summary: '获取我的学习进度、统计与趋势' })
  @Get('me')
  getMyProgress(@Request() req: { user: { id: number } }) {
    return this.progressService.getMyProgress(req.user.id);
  }

  // 主页卡片用：返回所有材料的进度 map
  @ApiOperation({ summary: '获取所有材料的进度（主页卡片用）' })
  @Get('materials')
  getMaterialsProgress(@Request() req: { user: { id: number } }) {
    return this.progressService.getMaterialsProgress(req.user.id);
  }
}