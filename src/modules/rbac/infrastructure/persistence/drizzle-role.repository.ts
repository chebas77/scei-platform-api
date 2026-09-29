import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { Db, DB } from '../../../../shared/database/tx';
import { PG_FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION, pgError } from '../../../../shared/database/pg-errors';
import { RoleRepositoryPort } from '../../domain/ports/role.repository.port';
import { NewRole, Role, RoleSummary, Scope } from '../../domain/rbac.types';
import { appModules } from './schema/modules.table';
import { permissions } from './schema/permissions.table';
import { rolePermissions } from './schema/role-permissions.table';
import { roleModules } from './schema/role-modules.table';
import { roles } from './schema/roles.table';

type Row = typeof roles.$inferSelect;

const toRole = (r: Row): Role => ({
  id: r.id,
  code: r.code,
  name: r.name,
  description: r.description,
  scope: r.scope as Scope,
  tenantId: r.tenantId,
  isSystem: r.isSystem,
  requiresMfa: r.requiresMfa,
  createdAt: r.createdAt,
});

@Injectable()
export class DrizzleRoleRepository implements RoleRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(filter: { scope?: Scope }): Promise<RoleSummary[]> {
    const rows = await this.db
      .select({
        role: roles,
        moduleCount: sql<number>`(select count(*)::int from ${roleModules} where ${roleModules.roleId} = ${roles.id})`,
        permissionCount: sql<number>`(select count(*)::int from ${rolePermissions} where ${rolePermissions.roleId} = ${roles.id})`,
      })
      .from(roles)
      .where(filter.scope ? eq(roles.scope, filter.scope) : undefined)
      .orderBy(asc(roles.scope), asc(roles.code));
    return rows.map((r) => ({ ...toRole(r.role), moduleCount: r.moduleCount, permissionCount: r.permissionCount }));
  }

  async findById(id: string): Promise<Role | null> {
    const [row] = await this.db.select().from(roles).where(eq(roles.id, id)).limit(1);
    return row ? toRole(row) : null;
  }

  async create(input: NewRole): Promise<Role | null> {
    try {
      const [row] = await this.db
        .insert(roles)
        .values({ code: input.code, name: input.name, description: input.description, scope: input.scope, requiresMfa: input.requiresMfa })
        .returning();
      return toRole(row);
    } catch (err) {
      if (pgError(err).code === PG_UNIQUE_VIOLATION) return null;
      throw err;
    }
  }

  async update(id: string, patch: { name?: string; description?: string; requiresMfa?: boolean }): Promise<Role | null> {
    const [row] = await this.db
      .update(roles)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return row ? toRole(row) : null;
  }

  async delete(id: string): Promise<'deleted' | 'in_use' | 'not_found'> {
    try {
      const rows = await this.db.delete(roles).where(eq(roles.id, id)).returning({ id: roles.id });
      return rows.length === 1 ? 'deleted' : 'not_found';
    } catch (err) {
      if (pgError(err).code === PG_FOREIGN_KEY_VIOLATION) return 'in_use';
      throw err;
    }
  }

  async getGrants(roleId: string): Promise<{ moduleIds: string[]; permissionIds: string[] }> {
    const [mods, perms] = await Promise.all([
      this.db.select({ id: roleModules.moduleId }).from(roleModules).where(eq(roleModules.roleId, roleId)),
      this.db.select({ id: rolePermissions.permissionId }).from(rolePermissions).where(eq(rolePermissions.roleId, roleId)),
    ]);
    return { moduleIds: mods.map((m) => m.id), permissionIds: perms.map((p) => p.id) };
  }

  async replaceModules(roleId: string, moduleIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(roleModules).where(eq(roleModules.roleId, roleId));
      if (moduleIds.length > 0) await tx.insert(roleModules).values(moduleIds.map((moduleId) => ({ roleId, moduleId })));
    });
  }

  async replacePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
      if (permissionIds.length > 0) await tx.insert(rolePermissions).values(permissionIds.map((permissionId) => ({ roleId, permissionId })));
    });
  }

  async effectivePermissionCodes(roleId: string): Promise<string[]> {
    const viaModules = await this.db
      .selectDistinct({ code: permissions.code })
      .from(roleModules)
      .innerJoin(appModules, and(eq(appModules.id, roleModules.moduleId), eq(appModules.isActive, true)))
      .innerJoin(permissions, and(eq(permissions.moduleId, appModules.id), eq(permissions.isActive, true)))
      .where(eq(roleModules.roleId, roleId));
    const viaPermissions = await this.db
      .selectDistinct({ code: permissions.code })
      .from(rolePermissions)
      .innerJoin(permissions, and(eq(permissions.id, rolePermissions.permissionId), eq(permissions.isActive, true)))
      .where(eq(rolePermissions.roleId, roleId));
    return [...new Set([...viaModules, ...viaPermissions].map((r) => r.code))].sort();
  }
}

