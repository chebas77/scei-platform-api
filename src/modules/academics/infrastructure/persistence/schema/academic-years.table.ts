import { check, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/** Ciclo escolar (año natural, ej. 2026). Grados y secciones se repiten cada ciclo. */
export const academicYears = pgTable(
  'academic_years',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    year: integer('year').notNull(),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('academic_years_status_chk', sql`${t.status} in ('active','closed')`),
    unique('academic_years_tenant_year_uq').on(t.tenantId, t.year),
    index('academic_years_tenant_idx').on(t.tenantId),
  ],
);
