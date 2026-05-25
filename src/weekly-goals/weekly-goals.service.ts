import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWeeklyGoalDto } from './dto/create-weekly-goal.dto';

@Injectable()
export class WeeklyGoalsService {
  constructor(private prisma: PrismaService) {}

  // 获取本周的周一和周日日期
  private getThisWeekRange(): { monday: Date; sunday: Date } {
    const now = new Date();
    const day = now.getDay(); // 0=周日, 1=周一 ...
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  }

  // GET /weekly-goals/current
  // 返回本周目标；null 表示本周未设置，前端据此决定是否弹窗
  async getCurrentGoal(userId: number) {
    const now = new Date();

    // 查询"现在"落在 week_start_date ~ week_end_date 范围内的目标
    // 比重新计算周一日期更可靠，不受时区影响
    const goal = await this.prisma.weeklyGoal.findFirst({
      where: {
        user_id: userId,
        week_start_date: { lte: now },
        week_end_date:   { gte: now },
      },
    });

    return goal;
  }

  // POST /weekly-goals
  // 创建本周目标；本周已有则更新（幂等）
  async createGoal(userId: number, dto: CreateWeeklyGoalDto) {
    const { monday, sunday } = this.getThisWeekRange();

    const existing = await this.prisma.weeklyGoal.findFirst({
      where: {
        user_id: userId,
        week_start_date: { gte: monday },
        week_end_date:   { lte: sunday },
      },
    });

    if (existing) {
      const goal = await this.prisma.weeklyGoal.update({
        where: { id: existing.id },
        data: { target_hours: dto.target_hours },
      });
      return { message: 'Weekly goal updated successfully.', goal };
    }

    const goal = await this.prisma.weeklyGoal.create({
      data: {
        user_id:         userId,
        target_hours:    dto.target_hours,
        week_start_date: monday,
        week_end_date:   sunday,
      },
    });
    return { message: 'Weekly goal saved successfully.', goal };
  }
}