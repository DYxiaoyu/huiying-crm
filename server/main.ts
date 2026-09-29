import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { join } from 'path';
import { existsSync } from 'fs';
import { __express as hbsExpressEngine } from 'hbs';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';

import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: process.env.NODE_ENV !== 'development',
  });
  const logger = new Logger('Bootstrap');
  const host = process.env.SERVER_HOST || 'localhost';
  const port = Number(process.env.SERVER_PORT || '3000');

  const bodyLimit = process.env.BODY_SIZE_LIMIT || '10mb';

  // body 解析（替代原平台 configureApp）
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ limit: bodyLimit, extended: true }));
  app.use(cookieParser());
  app.set('trust proxy', true);

  // 注册视图引擎, 渲染 client 目录下的 html 文件
  // 注意：vite 产物中 HTML 位于 dist/client/client/index.html，静态资源位于 dist/client/assets
  app.setBaseViewsDir(join(process.cwd(), 'dist/client/client'));
  app.useStaticAssets(join(process.cwd(), 'dist/client'), { index: false });
  app.setViewEngine('html');
  app.engine('html', hbsExpressEngine);

  // 上传文件静态服务（图片/附件），兼容 /uploads/ 与 /api/uploads/ 两种前缀
  const uploadsDir = process.env.UPLOAD_DIR || '/app/uploads';
  if (existsSync(uploadsDir)) {
    app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });
    app.useStaticAssets(uploadsDir, { prefix: '/api/uploads/' });
  } else {
    logger.warn(`Uploads dir ${uploadsDir} not found, /uploads 静态服务未启用`);
  }

  await app.listen(port, host);
  logger.log(`Server running on ${host}:${port}`);
  logger.log(`API endpoints ready at http://${host}:${port}/api`);
}

bootstrap();
