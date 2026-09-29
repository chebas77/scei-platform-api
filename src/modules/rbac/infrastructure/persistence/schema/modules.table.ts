import { boolean, check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/** Catálogo de módulos funcionales. Se sincroniza solo desde los controladores (`@ApiModule`). */
export const appModules = pgTable(
  'modules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    scope: text('scope').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('modules_scope_chk', sql`${t.scope} in ('platform','tenant')`)],
);
