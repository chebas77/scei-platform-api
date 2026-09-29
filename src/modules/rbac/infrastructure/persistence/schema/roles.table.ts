import { boolean, check, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * `tenant_id` nulo = rol global (plantilla del sistema o rol de plataforma).
 * La FK a `tenants` se declara en la migración `cross_module_foreign_keys`
 * para que los módulos no se importen entre sí.
 */
export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    scope: text('scope').notNull(),
    tenantId: uuid('tenant_id'),
    isSystem: boolean('is_system').notNull().default(false),
    requiresMfa: boolean('requires_mfa').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('roles_scope_chk', sql`${t.scope} in ('platform','tenant')`),
    unique('roles_code_tenant_uq').on(t.code, t.tenantId).nullsNotDistinct(),
  ],
);
