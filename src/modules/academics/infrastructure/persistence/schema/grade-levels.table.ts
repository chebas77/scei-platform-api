import { index, integer, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';

/** Catálogo fijo del colegio (ej. "1er año" .. "5to año"). No se repite por ciclo: las secciones sí. */
export const gradeLevels = pgTable(
  'grade_levels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name').notNull(),
    order: integer('order').notNull(),
  },
  (t) => [unique('grade_levels_tenant_name_uq').on(t.tenantId, t.name), index('grade_levels_tenant_idx').on(t.tenantId)],
);
