import { check, index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/** Matrícula: un alumno en una sección, dentro de un ciclo escolar. A lo más una activa por alumno y ciclo. */
export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    academicYearId: uuid('academic_year_id').notNull(),
    sectionId: uuid('section_id').notNull(),
    studentId: uuid('student_id').notNull(),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('enrollments_status_chk', sql`${t.status} in ('active','withdrawn')`),
    unique('enrollments_year_student_uq').on(t.academicYearId, t.studentId),
    index('enrollments_tenant_idx').on(t.tenantId),
    index('enrollments_section_idx').on(t.sectionId),
    index('enrollments_student_idx').on(t.studentId),
  ],
);
