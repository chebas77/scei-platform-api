import { bigserial, check, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Bitácora inmutable y encadenada por hash. Un trigger (migración `audit_immutable`)
 * impide UPDATE, DELETE y TRUNCATE: solo se puede insertar.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    actorUserId: uuid('actor_user_id'),
    actorType: text('actor_type').notNull().default('user'),
    action: text('action').notNull(),
    outcome: text('outcome').notNull(),
    resourceType: text('resource_type'),
    resourceId: text('resource_id'),
    tenantId: uuid('tenant_id'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    requestId: text('request_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    prevHash: text('prev_hash').notNull(),
    hash: text('hash').notNull(),
  },
  (t) => [
    check('audit_logs_outcome_chk', sql`${t.outcome} in ('success','denied','failure')`),
    check('audit_logs_actor_type_chk', sql`${t.actorType} in ('user','system')`),
    index('audit_logs_occurred_at_idx').on(t.occurredAt),
    index('audit_logs_action_idx').on(t.action),
    index('audit_logs_actor_idx').on(t.actorUserId),
    index('audit_logs_tenant_idx').on(t.tenantId),
  ],
);
