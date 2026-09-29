import { check, index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/** Terminal físico de un colegio (kiosco de asistencia/cafetería). FK entre módulos en su propia migración. */
export const kiosks = pgTable(
  'kiosks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('kiosks_status_chk', sql`${t.status} in ('active','inactive')`),
    unique('kiosks_tenant_code_uq').on(t.tenantId, t.code),
    index('kiosks_tenant_idx').on(t.tenantId),
  ],
);
