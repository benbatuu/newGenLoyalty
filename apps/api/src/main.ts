import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { isCorsOriginAllowed } from './common/cors-origins';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: (origin, callback) => {
      if (isCorsOriginAllowed(origin)) {
        callback(null, true);
      } else {
        // Reddedilen origin'de hata fırlatma (500 olur); CORS başlığı eklenmez, tarayıcı engeller.
        // Aynı kaynaktan gelen istekler (davet sayfası gibi) CORS'a takılmaz.
        callback(null, false);
      }
    },
    credentials: true,
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
    index: false,
    dotfiles: 'deny',
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=604800');
    },
  });

  const passkitLog = new Logger('PassKitHTTP');
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.path.startsWith('/v1')) {
      passkitLog.log(`${req.method} ${req.originalUrl}`);
    }
    next();
  });

  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);
  // Swagger / OpenAPI — /docs (UI) ve /docs-json (spec).
  // Prod'da kapatmak için SWAGGER_ENABLED=false yapın.
  const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Stampwell API')
      .setDescription(
        'Stampwell sadakat platformu REST API. ' +
          'JWT: `Authorization: Bearer <token>` (auth/login ile alınır). ' +
          'Enterprise API: `x-api-key` header. ' +
          'PassKit endpoint\'leri kendi ApplePass auth şemasını kullanır.',
      )
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
      .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'apiKey')
      .addServer(process.env.API_PUBLIC_BASE_URL ?? `http://localhost:${port}`)
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      jsonDocumentUrl: 'docs-json',
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
}
bootstrap();
