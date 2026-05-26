import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async getMyProgress(userId: number) {
    const now = new Date();

    const [records, weeklyGoal, sessions, accuracyResult, sentencesCount, trendResults] = await Promise.all([
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
      // 第 4 项：累计已练习句数
      this.prisma.practiceResult.count({
        where: { session: { user_id: userId } },
      }),
      // 第 3 项：带准确率的练习结果（按时间升序，用于趋势）
      this.prisma.practiceResult.findMany({
        where: { session: { user_id: userId }, accuracy_score: { not: null } },
        select: { accuracy_score: true, created_at: true },
        orderBy: { created_at: 'asc' },
      }),
    ]);

    const totalSeconds = sessions.reduce((sum, s) => sum + (s.total_time_spent ?? 0), 0);
    const totalHours   = (totalSeconds / 3600).toFixed(1);
    const avgAccuracy  = accuracyResult._avg.accuracy_score
      ? Math.round(Number(accuracyResult._avg.accuracy_score)) : null;
    const streak = this.calculateStreak(sessions.map((s) => s.started_at));

    // 第 3 项：按天聚合准确率趋势（取最近 30 天有数据的日期）
    const accuracyTrend = this.buildAccuracyTrend(trendResults, 30);

    // 第 4 项：按天聚合练习时长（分钟，取最近 14 天有数据的日期）
    const dailyDuration = this.buildDailyDuration(sessions, 14);

    return {
      inProgress: records.filter((r) => !r.completed_at),
      completed:  records.filter((r) => !!r.completed_at),
      weeklyGoal,
      stats: { totalHours, accuracy: avgAccuracy, streak, sentencesCount },
      accuracyTrend,
      dailyDuration,
    };
  }

  // 按天求平均准确率，返回最近 maxDays 个有数据的日期（升序）
  private buildAccuracyTrend(
    results: { accuracy_score: unknown; created_at: Date }[],
    maxDays: number,
  ): { date: string; accuracy: number }[] {
    const byDay = new Map<string, { sum: number; count: number }>();
    for (const r of results) {
      const day = r.created_at.toISOString().slice(0, 10);
      const e = byDay.get(day) ?? { sum: 0, count: 0 };
      e.sum += Number(r.accuracy_score);
      e.count += 1;
      byDay.set(day, e);
    }
    const all = Array.from(byDay.entries())
      .map(([date, { sum, count }]) => ({ date, accuracy: Math.round(sum / count) }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return all.slice(-maxDays);
  }

  // 按天累加练习时长（分钟），返回最近 maxDays 个有数据的日期（升序）
  private buildDailyDuration(
    sessions: { total_time_spent: number | null; started_at: Date }[],
    maxDays: number,
  ): { date: string; minutes: number }[] {
    const byDay = new Map<string, number>();
    for (const s of sessions) {
      const day = s.started_at.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + (s.total_time_spent ?? 0));
    }
    const all = Array.from(byDay.entries())
      .map(([date, seconds]) => ({ date, minutes: Math.round(seconds / 60) }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return all.slice(-maxDays);
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