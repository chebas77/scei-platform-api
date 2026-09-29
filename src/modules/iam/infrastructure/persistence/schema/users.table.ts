import { bigint, boolean, check, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Siempre en minúsculas y sin espacios (normalizado por el dominio). */
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    status: text('status').notNull().default('active'),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockoutCount: integer('lockout_count').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    /** Secreto TOTP cifrado con la clave maestra (nunca en claro). */
    mfaSecretEnc: text('mfa_secret_enc'),
    mfaPendingSecretEnc: text('mfa_pending_secret_enc'),
    /** Último intervalo TOTP aceptado: impide reutilizar el mismo código (replay). */
    mfaLastStep: bigint('mfa_last_step', { mode: 'number' }),
    /** Se incrementa para invalidar de inmediato todos los access tokens del usuario. */
    tokenVersion: integer('token_version').notNull().default(1),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('users_status_chk', sql`${t.status} in ('active','disabled')`)],
);
