import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Invitación de un solo uso para sumar un usuario a un rol existente (operador de plataforma
 * o administrador adicional de un colegio). `tenant_id` nulo = ámbito de plataforma.
 * Solo se guarda el hash del token; el token viaja por correo. FK entre módulos en su propia migración.
 */
export const operatorInvitations = pgTable(
  'operator_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id'),
    email: text('email').notNull(),
    roleId: uuid('role_id').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('operator_invitations_tenant_idx').on(t.tenantId), index('operator_invitations_email_idx').on(t.email)],
);
