import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.table';

/** Constancia firmada (HMAC-SHA256) de que los datos del colegio fueron borrados. */
export const deletionCertificates = pgTable('deletion_certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .unique()
    .references(() => tenants.id),
  tenantSlug: text('tenant_slug').notNull(),
  legalName: text('legal_name').notNull(),
  requestedBy: uuid('requested_by'),
  purgedBy: uuid('purged_by'),
  purgedAt: timestamp('purged_at', { withTimezone: true }).notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  signature: text('signature').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
