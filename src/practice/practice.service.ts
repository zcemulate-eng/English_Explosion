import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SaveProgressDto } from './dto/save-progress.dto';

@Injectable()
export class PracticeService {
  constructor(private prisma: PrismaService) {}

  // POST /practice/sessions
  async createOrResumeSession(userId: number, dto: CreateSessionDto) {
    // ① 指定 resume_session_id：恢复该会话
    if (dto.resume_session_id) {
      const existing = await this.prisma.practiceSession.findFirst({
        where: { id: dto.resume_session_id, user_id: userId },
      });
      if (existing) {
        await this.recordLearning(userId, existing.material_id, existing.id, 'resumed');
        return { session: existing, resumed: true };
      }
    }

    // ② 该材料存在未完成会话：自动恢复
    const unfinished = await this.prisma.practiceSession.findFirst({
      where: { user_id: userId, material_id: dto.material_id, status: 'in_progress' },
      orderBy: { started_at: 'desc' },
    });
    if (unfinished) {
      await this.recordLearning(userId, unfinished.material_id, unfinished.id, 'resumed');
      return { session: unfinished, resumed: true };
    }

    // ③ 全新开始
    const session = await this.prisma.practiceSession.create({
      data: { user_id: userId, material_id: dto.material_id, status: 'in_progress' },
    });
    await this.recordLearning(userId, session.material_id, session.id, 'started');
    return { session, resumed: false };
  }

  // 写入一条学习行为流水（事件日志，append-only）
  // 进度/时长不在此冗余存储，需要时通过 session 关联查询
  private async recordLearning(
    userId: number,
    materialId: number,
    sessionId: number,
    actionType: 'started' | 'resumed' | 'completed' | 'abandoned',
  ) {
    await this.prisma.learningRecord.create({
      data: {
        user_id:     userId,
        material_id: materialId,
        session_id:  sessionId,
        action_type: actionType,
      },
    });
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

    // 计算本次 session 的平均准确率（用于 best_accuracy）
    const accAgg = await this.prisma.practiceResult.aggregate({
      where: { session_id, accuracy_score: { not: null } },
      _avg: { accuracy_score: true },
    });
    const sessionAccuracy =
      accAgg._avg.accuracy_score != null ? Number(accAgg._avg.accuracy_score) : null;

    // 同步更新 UserProgress
    const existingProgress = await this.prisma.userProgress.findFirst({
      where: { user_id: userId, material_id },
    });
    if (existingProgress) {
      // best_accuracy：取历史最佳与本次的较大值
      const prevBest =
        existingProgress.best_accuracy != null ? Number(existingProgress.best_accuracy) : 0;
      const newBest =
        sessionAccuracy != null ? Math.max(prevBest, sessionAccuracy) : prevBest;

      // attempt_count：本次完成、且此前已完成过 → 视为再次完成，次数 +1
      const newAttemptCount =
        isCompleted && existingProgress.completed_at
          ? existingProgress.attempt_count + 1
          : existingProgress.attempt_count;

      await this.prisma.userProgress.update({
        where: { id: existingProgress.id },
        data: {
          progress_percentage,
          total_time_spent: (existingProgress.total_time_spent ?? 0) + addedTime,
          best_accuracy:    newBest,
          attempt_count:    newAttemptCount,
          last_accessed_at: new Date(),
          completed_at:     isCompleted ? new Date() : existingProgress.completed_at,
        },
      });
    } else {
      await this.prisma.userProgress.create({
        data: {
          user_id: userId, material_id, progress_percentage,
          total_time_spent: addedTime,
          best_accuracy:    sessionAccuracy ?? undefined,
          last_accessed_at: new Date(),
          completed_at:     isCompleted ? new Date() : null,
        },
      });
    }

    // 完成时记录一条 completed 行为流水
    if (isCompleted) {
      await this.recordLearning(userId, material_id, session_id, 'completed');
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