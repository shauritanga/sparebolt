import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const isDev = config.get('NODE_ENV') !== 'production';

  const uploadDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  // Public files: http://host:3001/uploads/<file>
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Dev: allow any origin (LAN phones). Prod: use CORS_ORIGIN list.
  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  app.enableCors({
    origin: isDev
      ? true
      : corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  });

  const port = config.get<number>('PORT', 3001);
  // 0.0.0.0 = reachable from other devices on the LAN
  await app.listen(port, '0.0.0.0');
  console.log(`SpareBolt API  http://localhost:${port}/api`);
  console.log(`Uploads         http://localhost:${port}/uploads/`);
  console.log(`LAN: use this machine's IP, e.g. http://<your-ip>:${port}/api`);
}

void bootstrap();
