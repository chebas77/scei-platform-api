import { doublePrecision, index, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.table';

/**
 * Métricas AGREGADAS por colegio (sin datos personales). Las alimentan los servicios
 * de asistencia, kioscos y colas; la plataforma solo las lee.
 */
export const tenantUsageSnapshots = pgTable(
  'tenant_usage_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
    studentsCount: integer('students_count').notNull().default(0),
    kiosksCount: integer('kiosks_count').notNull().default(0),
    apiP95Ms: doublePrecision('api_p95_ms'),
    queueDepth: integer('queue_depth'),
    errorRate: doublePrecision('error_rate'),
  },
  (t) => [index('tenant_usage_tenant_captured_idx').on(t.tenantId, t.capturedAt)],
);
