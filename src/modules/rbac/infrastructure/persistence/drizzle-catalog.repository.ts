import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { Db, DB } from '../../../../shared/database/tx';
import { CatalogRepositoryPort, SyncResult } from '../../domain/ports/catalog.repository.port';
import { CatalogEntry, ModuleEntity, ModuleWithPermissions, PermissionEntity, Scope } from '../../domain/rbac.types';
import { appModules } from './schema/modules.table';
import { permissions } from './schema/permissions.table';

const CATALOG_LOCK_KEY = 7_301_002;

const toModule = (m: typeof appModules.$inferSelect): ModuleEntity => ({
  id: m.id,
  key: m.key,
  name: m.name,
  description: m.description,
  scope: m.scope as Scope,
  isActive: m.isActive,
});

const toPermission = (p: typeof permissions.$inferSelect): PermissionEntity => ({
  id: p.id,
  code: p.code,
  moduleId: p.moduleId,
  description: p.description,
  endpoints: p.endpoints,
  isActive: p.isActive,
});

@Injectable()
export class DrizzleCatalogRepository implements CatalogRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async listModulesWithPermissions(): Promise<ModuleWithPermissions[]> {
    const mods = await this.db.select().from(appModules).where(eq(appModules.isActive, true)).orderBy(asc(appModules.scope), asc(appModules.key));
    if (mods.length === 0) return [];
    const perms = await this.db
      .select()
      .from(permissions)
      .where(and(eq(permissions.isActive, true), inArray(permissions.moduleId, mods.map((m) => m.id))))
      .orderBy(asc(permissions.code));
    return mods.map((m) => ({ module: toModule(m), permissions: perms.filter((p) => p.moduleId === m.id).map(toPermission) }));
  }

  async findModulesByIds(ids: string[]): Promise<ModuleEntity[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.select().from(appModules).where(and(inArray(appModules.id, ids), eq(appModules.isActive, true)));
    return rows.map(toModule);
  }

  async findPermissionsByIds(ids: string[]): Promise<(PermissionEntity & { moduleScope: Scope })[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select({ p: permissions, scope: appModules.scope })
      .from(permissions)
      .innerJoin(appModules, eq(appModules.id, permissions.moduleId))
      .where(and(inArray(permissions.id, ids), eq(permissions.isActive, true), eq(appModules.isActive, true)));
    return rows.map((r) => ({ ...toPermission(r.p), moduleScope: r.scope as Scope }));
  }

  async sync(entries: CatalogEntry[]): Promise<SyncResult> {
    return this.db.transaction(async (tx) => {
      // Varias instancias arrancando a la vez sincronizan de una en una.
      await tx.execute(sql`select pg_advisory_xact_lock(${CATALOG_LOCK_KEY})`);

      const moduleIds = new Map<string, string>();
      for (const { module } of entries) {
        const [row] = await tx
          .insert(appModules)
          .values({ key: module.key, name: module.name, description: module.description, scope: module.scope, isActive: true })
          .onConflictDoUpdate({
            target: appModules.key,
            set: { name: module.name, description: module.description ?? null, scope: module.scope, isActive: true, updatedAt: new Date() },
          })
          .returning({ id: appModules.id });
        moduleIds.set(module.key, row.id);
      }

      const codes: string[] = [];
      for (const { module, permissions: perms } of entries) {
        for (const perm of perms) {
          codes.push(perm.code);
          await tx
            .insert(permissions)
            .values({ code: perm.code, moduleId: moduleIds.get(module.key)!, description: perm.description, endpoints: perm.endpoints, isActive: true })
            .onConflictDoUpdate({
              target: permissions.code,
              set: { moduleId: moduleIds.get(module.key)!, description: perm.description, endpoints: perm.endpoints, isActive: true, updatedAt: new Date() },
            });
        }
      }

      // Lo que ya no existe en el código deja de conceder acceso (pero se conserva el historial).
      const keys = [...moduleIds.keys()];
      const deactivatedModules = await tx
        .update(appModules)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(appModules.isActive, true), keys.length > 0 ? notInArray(appModules.key, keys) : undefined))
        .returning({ id: appModules.id });
      const deactivatedPermissions = await tx
        .update(permissions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(permissions.isActive, true), codes.length > 0 ? notInArray(permissions.code, codes) : undefined))
        .returning({ id: permissions.id });

      // El SuperAdmin siempre tiene todos los módulos de plataforma activos.
      await tx.execute(sql`
        insert into role_modules (role_id, module_id)
        select r.id, m.id from roles r cross join modules m
        where r.code = 'platform_superadmin' and r.tenant_id is null and m.scope = 'platform' and m.is_active
        on conflict do nothing`);

      return {
        modules: moduleIds.size,
        permissions: codes.length,
        deactivatedModules: deactivatedModules.length,
        deactivatedPermissions: deactivatedPermissions.length,
      };
    });
  }
}
