import { index, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';

/** Instancia de un grado dentro de un ciclo escolar concreto (ej. "1°A" en 2026). */
export const sections = pgTable(
  'sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    academicYearId: uuid('academic_year_id').notNull(),
    gradeLevelId: uuid('grade_level_id').notNull(),
    name: text('name').notNull(),
  },
  (t) => [
    unique('sections_year_grade_name_uq').on(t.academicYearId, t.gradeLevelId, t.name),
    index('sections_tenant_idx').on(t.tenantId),
    index('sections_year_idx').on(t.academicYearId),
    index('sections_grade_idx').on(t.gradeLevelId),
  ],
);
