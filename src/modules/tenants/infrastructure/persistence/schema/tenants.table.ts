import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { plans } from './plans.table';

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    legalName: text('legal_name').notNull(),
    ruc: text('ruc').unique(),
    status: text('status').notNull().default('active'),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    suspensionReason: text('suspension_reason'),
    deletionRequestedAt: timestamp('deletion_requested_at', { withTimezone: true }),
    deletionRequestedBy: uuid('deletion_requested_by'),
    purgedAt: timestamp('purged_at', { withTimezone: true }),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('tenants_status_chk', sql`${t.status} in ('active','suspended','pending_deletion','purged')`),
    check('tenants_ruc_chk', sql`${t.ruc} is null or ${t.ruc} ~ '^[0-9]{11}$'`),
    check('tenants_slug_chk', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    index('tenants_status_idx').on(t.status),
    index('tenants_plan_idx').on(t.planId),
  ],
);
