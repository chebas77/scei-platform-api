import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { loadDotEnv } from '../config/load-dotenv';

/** Aplica las migraciones SQL versionadas de `drizzle/`. Uso: `npm run db:migrate`. */
export async function runMigrations(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  loadDotEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL no está definida');
    process.exit(1);
  }
  runMigrations(url)
    .then(() => console.log('Migraciones aplicadas'))
    .catch((err) => {
      console.error('Error al migrar:', err);
      process.exit(1);
    });
}
