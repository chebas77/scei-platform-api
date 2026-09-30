import { check, index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Perfil académico del alumno. El nombre va cifrado con la clave del colegio (TENANT_KEY_STORE):
 * la baja definitiva del colegio destruye la clave y este campo queda irrecuperable (crypto-shredding).
 * `user_id` referencia la cuenta (iam.users) con la que el alumno/padre inicia sesión: FK cruzada en su migración.
 */
export const students = pgTable(
  'students',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    code: text('code').notNull(),
    fullNameEnc: text('full_name_enc').notNull(),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('students_status_chk', sql`${t.status} in ('active','inactive')`),
    unique('students_tenant_code_uq').on(t.tenantId, t.code),
    unique('students_user_uq').on(t.userId),
    index('students_tenant_idx').on(t.tenantId),
  ],
);
