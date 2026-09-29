import { Pool } from 'pg';
import './env';
import { runMigrations } from '../src/shared/database/migrate';

/** Deja `scei_test` limpia y con todas las migraciones aplicadas antes de correr las pruebas. */
export default async function globalSetup(): Promise<void> {
  const url = process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:54329/scei_test';
  if (!/_test\b/.test(new URL(url).pathname)) throw new Error(`Por seguridad las pruebas solo corren contra una base *_test (${url})`);
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;');
  } finally {
    await pool.end();
  }
  await runMigrations(url);
}
