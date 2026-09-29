import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { appModules } from './modules.table';

export interface PermissionEndpoint {
  method: string;
  path: string;
}

/** Un permiso agrupa uno o más endpoints (`GET /tenants` y `GET /tenants/:id` comparten `tenants:read`). */
export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => appModules.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    endpoints: jsonb('endpoints').$type<PermissionEndpoint[]>().notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('permissions_module_idx').on(t.moduleId)],
);
