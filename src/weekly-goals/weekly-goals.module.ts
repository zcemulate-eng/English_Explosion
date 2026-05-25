import { Module } from '@nestjs/common';
import { WeeklyGoalsService } from './weekly-goals.service';
import { WeeklyGoalsController } from './weekly-goals.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WeeklyGoalsController],
  providers: [WeeklyGoalsService],
})
export class WeeklyGoalsModule {}