import { defineConfig } from 'drizzle-kit';

// Un archivo `*.table.ts` por tabla, dentro de cada módulo (capa de infraestructura).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/modules/**/infrastructure/persistence/schema/*.table.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:5432/scei' },
  strict: true,
  verbose: true,
});
