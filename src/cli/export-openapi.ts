import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../app.module';
import { loadConfig } from '../shared/config/env';
import { loadDotEnv } from '../shared/config/load-dotenv';
import { buildFastifyAdapter, configureApp } from '../shared/http/configure-app';

/** Uso: npm run openapi:export [ruta]  → escribe el contrato OpenAPI para generar el cliente del front. */
async function main(): Promise<void> {
  loadDotEnv();
  process.env.SWAGGER_ENABLED = 'true';
  const config = loadConfig();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, buildFastifyAdapter(config), { logger: ['error'] });
  await configureApp(app, config);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const res = await app.inject({ method: 'GET', url: '/docs-json' });
  writeFileSync(process.argv[2] ?? 'openapi.json', JSON.stringify(JSON.parse(res.body), null, 2));
  await app.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
