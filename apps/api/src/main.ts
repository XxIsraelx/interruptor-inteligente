import 'dotenv/config';
import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { AppModule } from './app.module';
import { runMigrations } from './db/migrate';

async function bootstrap() {
  const log = new Logger('Bootstrap');
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('Defina JWT_SECRET em produção');
  }

  // Mantém o banco sempre no schema mais recente (deploy sem passo extra)
  await runMigrations();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({ origin: origins, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  // Em produção a API também entrega o web app (build estático do Next em apps/web/out),
  // assim front, API, WebSocket e broker MQTT ficam num serviço só.
  const webDir = resolve(process.env.WEB_DIST_DIR || join(__dirname, '..', '..', 'web', 'out'));
  if (existsSync(join(webDir, 'index.html'))) {
    app.useStaticAssets(webDir, {
      extensions: ['html'],
      setHeaders: (res, path) => {
        // Arquivos com hash no nome podem ficar em cache; o HTML sempre revalida (deploy novo aparece na hora)
        res.setHeader('Cache-Control', path.includes('/_next/static/') ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    });
    app.use((req: Request, res: Response, next: NextFunction) => {
      const isApi = req.path.startsWith('/api') || req.path.startsWith('/socket.io');
      if (req.method !== 'GET' || isApi) return next();
      res.status(404).sendFile(join(webDir, '404.html'));
    });
    log.log(`Servindo o web app de ${webDir}`);
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  log.log(`API ouvindo em http://localhost:${port}/api`);
}
bootstrap();
