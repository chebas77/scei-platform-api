/** Drizzle envuelve el error de `pg` en `cause`; esto devuelve los datos del error de Postgres sea cual sea la capa. */
export interface PgErrorInfo {
  code?: string;
  constraint?: string;
}

export function pgError(err: unknown): PgErrorInfo {
  const candidates = [err, (err as { cause?: unknown } | null)?.cause];
  for (const c of candidates) {
    const e = c as { code?: unknown; constraint?: unknown } | null;
    if (e && typeof e.code === 'string') return { code: e.code, constraint: typeof e.constraint === 'string' ? e.constraint : undefined };
  }
  return {};
}

export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FOREIGN_KEY_VIOLATION = '23503';
