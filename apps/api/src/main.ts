import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    // Reflect request origin — web admin/marketing + Flutter web; native apps skip CORS.
    origin: true,
    credentials: true,
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  const passkitLog = new Logger('PassKitHTTP');
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.path.startsWith('/v1')) {
      passkitLog.log(`${req.method} ${req.originalUrl}`);
    }
    next();
  });

  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);
  await app.listen(port);
}
bootstrap();
