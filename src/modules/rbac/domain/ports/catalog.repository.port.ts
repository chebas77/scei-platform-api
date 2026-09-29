import { CatalogEntry, ModuleEntity, ModuleWithPermissions, PermissionEntity, Scope } from '../rbac.types';

export interface SyncResult {
  modules: number;
  permissions: number;
  deactivatedModules: number;
  deactivatedPermissions: number;
}

export interface CatalogRepositoryPort {
  listModulesWithPermissions(): Promise<ModuleWithPermissions[]>;
  findModulesByIds(ids: string[]): Promise<ModuleEntity[]>;
  findPermissionsByIds(ids: string[]): Promise<(PermissionEntity & { moduleScope: Scope })[]>;
  /**
   * Sincroniza el catálogo con lo descubierto en el código (idempotente y serializado entre instancias).
   * Lo que ya no existe en el código se desactiva; el rol `platform_superadmin` recibe todo módulo de plataforma.
   */
  sync(entries: CatalogEntry[]): Promise<SyncResult>;
}
export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');
