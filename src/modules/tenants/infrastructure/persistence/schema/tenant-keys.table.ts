import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.table';

/**
 * Clave de datos (DEK) propia de cada colegio, envuelta con la clave maestra.
 * Borrado criptográfico: al dar de baja se anula `wrapped_dek`; lo cifrado con ella
 * deja de ser recuperable aunque queden copias de respaldo.
 */
export const tenantKeys = pgTable('tenant_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .unique()
    .references(() => tenants.id),
  wrappedDek: text('wrapped_dek'),
  keyVersion: integer('key_version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  destroyedAt: timestamp('destroyed_at', { withTimezone: true }),
});
