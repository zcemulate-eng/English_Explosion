import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { WeeklyGoalsService } from './weekly-goals.service';
import { CreateWeeklyGoalDto } from './dto/create-weekly-goal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// 所有路由都需要登录
@UseGuards(JwtAuthGuard)
@SkipThrottle()
@Controller('weekly-goals')
export class WeeklyGoalsController {
  constructor(private readonly weeklyGoalsService: WeeklyGoalsService) {}

  // 查询本周目标（null = 未设置，前端弹窗）
  @Get('current')
  getCurrentGoal(@Request() req: { user: { id: number } }) {
    return this.weeklyGoalsService.getCurrentGoal(req.user.id);
  }

  // 设置 / 更新本周目标
  @Post()
  createGoal(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateWeeklyGoalDto,
  ) {
    return this.weeklyGoalsService.createGoal(req.user.id, dto);
  }
}