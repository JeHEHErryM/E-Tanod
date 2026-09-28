import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.use(helmet());

  const uploadDir = config.get<string>('UPLOAD_DIR', join(process.cwd(), 'uploads'));
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  app.setGlobalPrefix('api', { exclude: ['health'] });

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:5173')?.split(',') ?? [],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(
    `API listening on http://localhost:${port} (uploads: ${uploadDir})`,
  );
}

void bootstrap();
