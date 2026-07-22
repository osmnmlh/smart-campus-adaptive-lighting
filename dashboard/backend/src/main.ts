import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { loadEnvironment } from './common/config/environment.js';
import { configureRealtimeWebSocketAdapter } from './realtime/transport/realtime-ws-adapter.js';

async function bootstrap(): Promise<void> {
  const environment = loadEnvironment();
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: environment.corsOrigins,
  });
  configureRealtimeWebSocketAdapter(app, environment);
  app.enableShutdownHooks();

  await app.listen(environment.port, environment.host);
  Logger.log(
    `Backend listening on http://${environment.host}:${environment.port}`,
    '@smart-campus/backend',
  );
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  Logger.error(message, undefined, '@smart-campus/backend');
  process.exitCode = 1;
});
