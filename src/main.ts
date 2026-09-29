import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { loadConfig } from './shared/config/env';
import { loadDotEnv } from './shared/config/load-dotenv';
import { buildFastifyAdapter, configureApp } from './shared/http/configure-app';

async function bootstrap(): Promise<void> {
  loadDotEnv();
  const config = loadConfig();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, buildFastifyAdapter(config), { bufferLogs: false });
  await configureApp(app, config);
  await app.listen(config.PORT, '0.0.0.0');
}

void bootstrap();
