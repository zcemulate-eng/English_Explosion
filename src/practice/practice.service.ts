import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SaveProgressDto } from './dto/save-progress.dto';

@Injectable()
export class PracticeService {
  constructor(private prisma: PrismaService) {}

  // POST /practice/sessions
  async createOrResumeSession(userId: number, dto: CreateSessionDto) {
    if (dto.resume_session_id) {
      const existing = await this.prisma.practiceSession.findFirst({
        where: { id: dto.resume_session_id, user_id: userId },
      });
      if (existing) return { session: existing, resumed: true };
    }

    const unfinished = await this.prisma.practiceSession.findFirst({
      where: { user_id: userId, material_id: dto.material_id, status: 'in_progress' },
      orderBy: { started_at: 'desc' },
    });
    if (unfinished) return { session: unfinished, resumed: true };

    const session = await this.prisma.practiceSession.create({
      data: { user_id: userId, material_id: dto.material_id, status: 'in_progress' },
    });
    return { session, resumed: false };
  }

  // POST /practice/progress
  async saveProgress(userId: number, dto: SaveProgressDto) {
    const {
      session_id, material_id, progress_percentage,
      current_sentence_id, answers, time_spent_seconds,
    } = dto;

    const addedTime = time_spent_seconds ?? 0;

    // 批量写入答案（跳过已存在的）
    if (answers.length > 0) {
      const existing = await this.prisma.practiceResult.findMany({
        where: { session_id, sentence_id: { in: answers.map((a) => a.sentence_id) } },
        select: { sentence_id: true },
      });
      const existingIds = new Set(existing.map((e) => e.sentence_id));
      const toCreate = answers
        .filter((a) => !existingIds.has(a.sentence_id))
        .map((a) => ({
          session_id,
          sentence_id:    a.sentence_id,
          user_answer:    a.user_answer,
          correct_answer: a.correct_answer,
          accuracy_score: a.accuracy_score ?? null,
          is_correct:     a.accuracy_score != null ? a.accuracy_score >= 80 : null,
        }));
      if (toCreate.length > 0) {
        await this.prisma.practiceResult.createMany({ data: toCreate });
      }
    }

    const isCompleted = progress_percentage >= 100;

    // 获取当前 session 已累计时长
    const currentSession = await this.prisma.practiceSession.findUnique({
      where: { id: session_id },
      select: { total_time_spent: true },
    });
    const totalTime = (currentSession?.total_time_spent ?? 0) + addedTime;

    // 更新 session
    await this.prisma.practiceSession.update({
      where: { id: session_id },
      data: {
        progress_percentage,
        current_sentence_id: current_sentence_id ?? null,
        status:           isCompleted ? 'completed' : 'in_progress',
        completed_at:     isCompleted ? new Date() : null,
        total_time_spent: totalTime,
      },
    });

    // 同步更新 UserProgress
    const existingProgress = await this.prisma.userProgress.findFirst({
      where: { user_id: userId, material_id },
    });
    if (existingProgress) {
      await this.prisma.userProgress.update({
        where: { id: existingProgress.id },
        data: {
          progress_percentage,
          total_time_spent: (existingProgress.total_time_spent ?? 0) + addedTime,
          last_accessed_at: new Date(),
          completed_at:     isCompleted ? new Date() : null,
        },
      });
    } else {
      await this.prisma.userProgress.create({
        data: {
          user_id: userId, material_id, progress_percentage,
          total_time_spent: addedTime,
          last_accessed_at: new Date(),
          completed_at:     isCompleted ? new Date() : null,
        },
      });
    }

    // ── 累加 Weekly Goal completed_hours ──────────────────────────────────
    // 只有本次有实际练习时长才更新
    if (addedTime > 0) {
      const now = new Date();
      const weeklyGoal = await this.prisma.weeklyGoal.findFirst({
        where: {
          user_id: userId,
          week_start_date: { lte: now },
          week_end_date:   { gte: now },
        },
      });

      if (weeklyGoal) {
        const addedHours  = addedTime / 3600; // 秒转小时
        const newCompleted = Number(weeklyGoal.completed_hours) + addedHours;
        const targetHours  = Number(weeklyGoal.target_hours);
        const isAchieved   = newCompleted >= targetHours;

        await this.prisma.weeklyGoal.update({
          where: { id: weeklyGoal.id },
          data: {
            completed_hours: newCompleted,
            is_achieved:     isAchieved,
          },
        });
      }
    }

    return { message: 'Progress saved.', completed: isCompleted };
  }

  // GET /practice/sessions/:materialId/latest
  async getLatestSession(userId: number, materialId: number) {
    return this.prisma.practiceSession.findFirst({
      where: { user_id: userId, material_id: materialId, status: 'in_progress' },
      orderBy: { started_at: 'desc' },
      include: { current_sentence: { select: { id: true, order_index: true } } },
    });
  }
}