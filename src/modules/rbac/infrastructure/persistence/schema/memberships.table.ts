import { check, index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Quién tiene qué rol y dónde. `tenant_id` nulo = rol de plataforma.
 * Un usuario puede tener membresías en varios colegios con roles distintos.
 * Las FK a `users` y `tenants` van en la migración `cross_module_foreign_keys`.
 */
export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    roleId: uuid('role_id').notNull(),
    tenantId: uuid('tenant_id'),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('memberships_status_chk', sql`${t.status} in ('active','revoked')`),
    unique('memberships_user_role_tenant_uq').on(t.userId, t.roleId, t.tenantId).nullsNotDistinct(),
    index('memberships_user_idx').on(t.userId),
    index('memberships_tenant_idx').on(t.tenantId),
  ],
);
