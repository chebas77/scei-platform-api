import { NewRole, Role, RoleSummary, Scope } from '../rbac.types';

export interface RoleRepositoryPort {
  list(filter: { scope?: Scope }): Promise<RoleSummary[]>;
  findById(id: string): Promise<Role | null>;
  /** Devuelve `null` si el código ya existe. */
  create(input: NewRole): Promise<Role | null>;
  update(id: string, patch: { name?: string; description?: string; requiresMfa?: boolean }): Promise<Role | null>;
  delete(id: string): Promise<'deleted' | 'in_use' | 'not_found'>;
  getGrants(roleId: string): Promise<{ moduleIds: string[]; permissionIds: string[] }>;
  replaceModules(roleId: string, moduleIds: string[]): Promise<void>;
  replacePermissions(roleId: string, permissionIds: string[]): Promise<void>;
  /** Códigos de permiso que el rol concede (módulos + sueltos), solo activos. */
  effectivePermissionCodes(roleId: string): Promise<string[]>;
}
export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');
