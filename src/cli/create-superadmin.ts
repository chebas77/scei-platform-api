import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CreatePlatformAdminUseCase } from '../modules/iam/application/create-platform-admin.use-case';
import { loadDotEnv } from '../shared/config/load-dotenv';

/**
 * Uso:  SUPERADMIN_EMAIL=ops@empresa.pe SUPERADMIN_PASSWORD='...' npm run cli:create-superadmin
 * La clave llega por variable de entorno (no por argumento, para no quedar en el historial del shell).
 * El primer login del operador exige enrolar la verificación en dos pasos.
 */
async function main(): Promise<void> {
  loadDotEnv();
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!email || !password) {
    console.error('Define SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD.');
    process.exit(1);
  }
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const { created } = await app.get(CreatePlatformAdminUseCase).execute({ email, password });
    console.log(created ? 'SuperAdmin creado.' : 'La cuenta ya existía; se le asignó el rol (su clave no cambió).');
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
