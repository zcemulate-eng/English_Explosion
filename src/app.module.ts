import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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

    // ─── Rate Limiting 全局配置 ───────────────────────────────────────────────
    // ttl   = 时间窗口（毫秒），60000 = 60 秒
    // limit = 该窗口内允许的最大请求次数，超过返回 429 Too Many Requests
    //
    // ⚠️ 当前为【开发模式：宽松】，方便本地反复调试不被拦。
    //    上线前请把数值调回生产水平（见下方各行末尾的「生产建议」）。
    //
    // 调整位置：直接改下面的 limit 数字即可。
    //   - default 作用于所有未单独标注的接口
    //   - strict  作用于 auth.controller 里标了 @Throttle({ strict: ... }) 的敏感接口
    //     （注意：auth.controller 每个接口还各自覆盖了自己的 limit，
    //      如需逐个调整去那个文件改；这里的 strict 是兜底默认值）
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 1000,   // 开发：1000 次/分（基本不会触发）。生产建议：60
      },
      {
        name: 'strict',
        ttl: 60000,
        limit: 100,    // 开发：100 次/分。生产建议：5
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
    // 注册全局限流守卫，让 ThrottlerModule 的配置和各接口的 @Throttle 真正生效。
    // 不注册这行的话，所有限流装饰器都只是摆设、不会拦截。
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}