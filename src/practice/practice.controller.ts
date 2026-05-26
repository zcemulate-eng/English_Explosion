import { Body, Controller, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PracticeService } from './practice.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SaveProgressDto } from './dto/save-progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('practice')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('practice')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  // 开始 / 恢复练习
  @ApiOperation({ summary: '开始或恢复练习会话' })
  @Post('sessions')
  createSession(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateSessionDto,
  ) {
    return this.practiceService.createOrResumeSession(req.user.id, dto);
  }

  // 批量保存答案和进度
  @ApiOperation({ summary: '批量保存答案与练习进度' })
  @Post('progress')
  saveProgress(
    @Request() req: { user: { id: number } },
    @Body() dto: SaveProgressDto,
  ) {
    return this.practiceService.saveProgress(req.user.id, dto);
  }

  // 查询某材料最新未完成 session
  @ApiOperation({ summary: '查询某材料最新的未完成会话' })
  @Get('sessions/:materialId/latest')
  getLatestSession(
    @Request() req: { user: { id: number } },
    @Param('materialId', ParseIntPipe) materialId: number,
  ) {
    return this.practiceService.getLatestSession(req.user.id, materialId);
  }
}