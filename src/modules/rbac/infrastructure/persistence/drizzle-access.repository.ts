import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { Db, DB, Tx, executor as pick } from '../../../../shared/database/tx';
import { AccessRepositoryPort } from '../../domain/ports/access.repository.port';
import { memberships } from './schema/memberships.table';
import { appModules } from './schema/modules.table';
import { permissions } from './schema/permissions.table';
import { rolePermissions } from './schema/role-permissions.table';
import { roleModules } from './schema/role-modules.table';
import { roles } from './schema/roles.table';

@Injectable()
export class DrizzleAccessRepository implements AccessRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async effectivePermissionCodes(userId: string, tenantId: string | null): Promise<string[]> {
    const where = and(
      eq(memberships.userId, userId),
      eq(memberships.status, 'active'),
      tenantId === null ? isNull(memberships.tenantId) : eq(memberships.tenantId, tenantId),
    );

    // 1) Permisos que aporta cada módulo asignado al rol.
    const viaModules = await this.db
      .selectDistinct({ code: permissions.code })
      .from(memberships)
      .innerJoin(roleModules, eq(roleModules.roleId, memberships.roleId))
      .innerJoin(appModules, and(eq(appModules.id, roleModules.moduleId), eq(appModules.isActive, true)))
      .innerJoin(permissions, and(eq(permissions.moduleId, appModules.id), eq(permissions.isActive, true)))
      .where(where);

    // 2) Permisos sueltos asignados al rol.
    const viaPermissions = await this.db
      .selectDistinct({ code: permissions.code })
      .from(memberships)
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, memberships.roleId))
      .innerJoin(permissions, and(eq(permissions.id, rolePermissions.permissionId), eq(permissions.isActive, true)))
      .innerJoin(appModules, and(eq(appModules.id, permissions.moduleId), eq(appModules.isActive, true)))
      .where(where);

    return [...new Set([...viaModules, ...viaPermissions].map((r) => r.code))];
  }

  async anyRoleRequiresMfa(userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: roles.id })
      .from(memberships)
      .innerJoin(roles, eq(roles.id, memberships.roleId))
      .where(and(eq(memberships.userId, userId), eq(memberships.status, 'active'), eq(roles.requiresMfa, true)))
      .limit(1);
    return rows.length > 0;
  }

  async findSystemRole(code: string): Promise<{ id: string; scope: 'platform' | 'tenant' } | null> {
    const [row] = await this.db
      .select({ id: roles.id, scope: roles.scope })
      .from(roles)
      .where(and(eq(roles.code, code), eq(roles.isSystem, true), isNull(roles.tenantId)))
      .limit(1);
    return row ? { id: row.id, scope: row.scope as 'platform' | 'tenant' } : null;
  }

  async findRoleScope(roleId: string): Promise<'platform' | 'tenant' | null> {
    const [row] = await this.db.select({ scope: roles.scope }).from(roles).where(eq(roles.id, roleId)).limit(1);
    return row ? (row.scope as 'platform' | 'tenant') : null;
  }

  async assign(input: { userId: string; roleId: string; tenantId: string | null }, tx?: Tx): Promise<void> {
    await pick(this.db, tx)
      .insert(memberships)
      .values({ userId: input.userId, roleId: input.roleId, tenantId: input.tenantId })
      .onConflictDoUpdate({
        target: [memberships.userId, memberships.roleId, memberships.tenantId],
        set: { status: 'active' },
      });
  }

  async revokeAllForTenant(tenantId: string, tx?: Tx): Promise<number> {
    const rows = await pick(this.db, tx).delete(memberships).where(eq(memberships.tenantId, tenantId)).returning({ id: memberships.id });
    return rows.length;
  }
}
