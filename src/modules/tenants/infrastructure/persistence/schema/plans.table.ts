import { boolean, check, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const plans = pgTable(
  'plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    maxStudents: integer('max_students').notNull(),
    maxKiosks: integer('max_kiosks').notNull(),
    /** Días que se conservan marcas y plantillas antes del borrado automático. */
    retentionDays: integer('retention_days').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('plans_limits_chk', sql`${t.maxStudents} > 0 and ${t.maxKiosks} > 0 and ${t.retentionDays} > 0`),
  ],
);
