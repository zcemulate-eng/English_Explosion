import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 安全响应头（防 XSS / 点击劫持 / MIME 嗅探等）
  // 放宽跨源资源策略：音频通过 /materials/:id/audio 重定向到 OSS，
  // helmet 默认的 same-origin 策略会拦截跨源音频，故改为 cross-origin。
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // 增大请求体限制到 10MB，支持 base64 图片上传（5MB 图片 base64 后约 7MB）
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // ─── Swagger API 文档 ───────────────────────────────────────────────────────
  // 启动后访问 http://localhost:3001/api-docs 查看交互式接口文档。
  // addBearerAuth() 让文档页右上角出现 “Authorize” 按钮，
  // 填入 JWT（不含 Bearer 前缀）后即可直接测试需要登录的接口。
  const swaggerConfig = new DocumentBuilder()
    .setTitle('English Explosion API')
    .setDescription('英语精听网站后端接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Backend is running on: http://localhost:${port}`);
  console.log(`API docs available at: http://localhost:${port}/api-docs`);
}
bootstrap();