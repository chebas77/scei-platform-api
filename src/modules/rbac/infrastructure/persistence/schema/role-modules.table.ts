import { pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { appModules } from './modules.table';
import { roles } from './roles.table';

/** Asignar un módulo a un rol concede todos los permisos (APIs) de ese módulo. */
export const roleModules = pgTable(
  'role_modules',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => appModules.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.moduleId] })],
);
