import { pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { permissions } from './permissions.table';
import { roles } from './roles.table';

/** Permisos sueltos (APIs puntuales) además de los que aporta cada módulo asignado. */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);
