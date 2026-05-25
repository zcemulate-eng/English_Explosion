import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { MaterialsModule } from './materials/materials.module';
import { AuthModule } from './auth/auth.module';
import { WeeklyGoalsModule } from './weekly-goals/weekly-goals.module';
import { PracticeModule } from './practice/practice.module';
import { ProgressModule } from './progress/progress.module';
import { NotesModule } from './notes/notes.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),

    // Rate Limiting 全局配置
    // default：普通接口 60秒内最多 60次请求
    // strict：敏感接口 60秒内最多 5次请求（登录、注册、忘记密码）
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,   // 时间窗口：60秒
        limit: 60,    // 最多请求次数
      },
      {
        name: 'strict',
        ttl: 60000,   // 时间窗口：60秒
        limit: 5,     // 敏感接口最多5次
      },
    ]),

    PrismaModule,
    MaterialsModule,
    AuthModule,
    WeeklyGoalsModule,
    PracticeModule,
    ProgressModule,
    NotesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModule {}