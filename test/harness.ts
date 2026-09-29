import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { authenticator } from 'otplib';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { CLOCK, ClockPort } from '../src/shared/clock/clock.port';
import { loadConfig } from '../src/shared/config/env';
import { buildFastifyAdapter, configureApp } from '../src/shared/http/configure-app';
import { ConsoleNotifier } from '../src/modules/tenants/infrastructure/notifications/console-notifier';
import { CreatePlatformAdminUseCase } from '../src/modules/iam/application/create-platform-admin.use-case';

export class FakeClock implements ClockPort {
  private offsetMs = 0;
  now(): Date {
    return new Date(Date.now() + this.offsetMs);
  }
  advanceDays(days: number): void {
    this.offsetMs += days * 86_400_000;
  }
}

export interface Harness {
  app: NestFastifyApplication;
  clock: FakeClock;
  notifier: ConsoleNotifier;
  pool: Pool;
  req: (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, opts?: { token?: string; body?: unknown }) => Promise<{ status: number; body: any }>;
  loginSuperadmin: () => Promise<string>;
  close: () => Promise<void>;
}

export const SUPERADMIN = { email: 'ops@plataforma.pe', password: 'Clave-Segura-Plataforma-2026' };

export async function createHarness(): Promise<Harness> {
  const clock = new FakeClock();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(CLOCK).useValue(clock).compile();
  const config = loadConfig();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(buildFastifyAdapter(config));
  await configureApp(app, config);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

  const req: Harness['req'] = async (method, url, opts = {}) => {
    const res = await app.inject({
      method, url,
      headers: opts.token ? { authorization: `Bearer ${opts.token}` } : {},
      ...(opts.body !== undefined ? { payload: opts.body as object } : {}),
    });
    let body: any = null;
    try { body = res.body ? JSON.parse(res.body) : null; } catch { body = res.body; }
    return { status: res.statusCode, body };
  };

  const loginSuperadmin = async (): Promise<string> => {
    await app.get(CreatePlatformAdminUseCase).execute(SUPERADMIN);
    const login = await req('POST', '/v1/auth/login', { body: SUPERADMIN });
    if (login.body.status === 'mfa_setup_required') {
      const setup = login.body.setupToken.accessToken as string;
      const enroll = await req('POST', '/v1/auth/mfa/enroll', { token: setup });
      const confirm = await req('POST', '/v1/auth/mfa/confirm', { token: setup, body: { code: authenticator.generate(enroll.body.manualEntryKey) } });
      await pool.query('update users set mfa_last_step = null where email = $1', [SUPERADMIN.email]);
      return confirm.body.accessToken as string;
    }
    throw new Error(`Login inesperado: ${JSON.stringify(login.body)}`);
  };

  return {
    app, clock, notifier: app.get(ConsoleNotifier), pool, req, loginSuperadmin,
    close: async () => { await pool.end(); await app.close(); },
  };
}
