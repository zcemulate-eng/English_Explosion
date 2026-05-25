import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async getMyProgress(userId: number) {
    const now = new Date();

    const [records, weeklyGoal, sessions, accuracyResult] = await Promise.all([
      this.prisma.userProgress.findMany({
        where: { user_id: userId },
        orderBy: { last_accessed_at: 'desc' },
        include: {
          material: {
            select: { id: true, title: true, difficulty_level: true, total_sentences: true },
          },
        },
      }),
      this.prisma.weeklyGoal.findFirst({
        where: {
          user_id: userId,
          week_start_date: { lte: now },
          week_end_date:   { gte: now },
        },
      }),
      this.prisma.practiceSession.findMany({
        where: { user_id: userId },
        select: { total_time_spent: true, started_at: true },
        orderBy: { started_at: 'desc' },
      }),
      this.prisma.practiceResult.aggregate({
        where: { session: { user_id: userId }, accuracy_score: { not: null } },
        _avg: { accuracy_score: true },
      }),
    ]);

    const totalSeconds = sessions.reduce((sum, s) => sum + (s.total_time_spent ?? 0), 0);
    const totalHours   = (totalSeconds / 3600).toFixed(1);
    const avgAccuracy  = accuracyResult._avg.accuracy_score
      ? Math.round(Number(accuracyResult._avg.accuracy_score)) : null;
    const streak = this.calculateStreak(sessions.map((s) => s.started_at));

    return {
      inProgress: records.filter((r) => !r.completed_at),
      completed:  records.filter((r) => !!r.completed_at),
      weeklyGoal,
      stats: { totalHours, accuracy: avgAccuracy, streak },
    };
  }

  // GET /progress/materials — 返回当前用户所有有进度的材料的进度 Map
  // 供主页卡片使用，key = material_id, value = { progress_percentage, completed }
  async getMaterialsProgress(userId: number) {
    const records = await this.prisma.userProgress.findMany({
      where: { user_id: userId },
      select: {
        material_id: true,
        progress_percentage: true,
        completed_at: true,
      },
    });

    // 转成 { [material_id]: { pct, completed } } 格式，前端方便直接查询
    const result: Record<number, { pct: number; completed: boolean }> = {};
    for (const r of records) {
      result[r.material_id] = {
        pct:       Math.round(Number(r.progress_percentage) || 0),
        completed: !!r.completed_at,
      };
    }
    return result;
  }

  private calculateStreak(dates: Date[]): number {
    if (dates.length === 0) return 0;
    const practiceDays = new Set(dates.map((d) => d.toISOString().slice(0, 10)));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      const dayStr = day.toISOString().slice(0, 10);
      if (practiceDays.has(dayStr)) { streak++; }
      else if (i !== 0) break;
    }
    return streak;
  }
}