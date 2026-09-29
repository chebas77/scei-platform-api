import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { CATALOG_REPOSITORY, CatalogRepositoryPort } from '../domain/ports/catalog.repository.port';
import { ROLE_REPOSITORY, RoleRepositoryPort } from '../domain/ports/role.repository.port';
import { LOCKED_ROLE_CODES, ModuleWithPermissions, NewRole, Role, RoleSummary, Scope } from '../domain/rbac.types';

export interface RoleDetail {
  role: Role;
  moduleIds: string[];
  permissionIds: string[];
  effectivePermissions: string[];
}

/** Casos de uso de administración de roles y del catálogo (agrupados: comparten reglas de ámbito y bloqueo). */
@Injectable()
export class RoleManagementService {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort,
    @Inject(CATALOG_REPOSITORY) private readonly catalog: CatalogRepositoryPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
  ) {}

  listModules(): Promise<ModuleWithPermissions[]> {
    return this.catalog.listModulesWithPermissions();
  }

  listRoles(scope?: Scope): Promise<RoleSummary[]> {
    return this.roles.list({ scope });
  }

  async getRole(id: string): Promise<RoleDetail> {
    const role = await this.requireRole(id);
    const [grants, effectivePermissions] = await Promise.all([this.roles.getGrants(id), this.roles.effectivePermissionCodes(id)]);
    return { role, ...grants, effectivePermissions: effectivePermissions.sort() };
  }

  async createRole(input: NewRole, actorId: string, meta: RequestMeta): Promise<Role> {
    const created = await this.roles.create(input);
    if (!created) throw new AppException(ErrorCodes.RBAC_ROLE_CODE_TAKEN);
    await this.audit.record({
      action: 'role.created', outcome: 'success', actorUserId: actorId, resourceType: 'role', resourceId: created.id, meta,
      metadata: { code: created.code, scope: created.scope },
    });
    return created;
  }

  async updateRole(id: string, patch: { name?: string; description?: string; requiresMfa?: boolean }, actorId: string, meta: RequestMeta): Promise<Role> {
    const role = await this.requireNotSystem(id);
    const updated = await this.roles.update(role.id, patch);
    if (!updated) throw new AppException(ErrorCodes.RBAC_ROLE_NOT_FOUND);
    await this.audit.record({
      action: 'role.updated', outcome: 'success', actorUserId: actorId, resourceType: 'role', resourceId: id, meta,
      metadata: { fields: Object.keys(patch) },
    });
    return updated;
  }

  async deleteRole(id: string, actorId: string, meta: RequestMeta): Promise<void> {
    await this.requireNotSystem(id);
    const result = await this.roles.delete(id);
    if (result === 'not_found') throw new AppException(ErrorCodes.RBAC_ROLE_NOT_FOUND);
    if (result === 'in_use') throw new AppException(ErrorCodes.RBAC_ROLE_IN_USE);
    await this.audit.record({ action: 'role.deleted', outcome: 'success', actorUserId: actorId, resourceType: 'role', resourceId: id, meta });
  }

  async setModules(id: string, moduleIds: string[], actorId: string, meta: RequestMeta): Promise<RoleDetail> {
    const role = await this.requireModulesEditable(id);
    const unique = [...new Set(moduleIds)];
    const found = await this.catalog.findModulesByIds(unique);
    if (found.length !== unique.length) throw new AppException(ErrorCodes.RBAC_MODULE_NOT_FOUND);
    if (found.some((m) => m.scope !== role.scope)) throw new AppException(ErrorCodes.RBAC_SCOPE_MISMATCH);
    await this.roles.replaceModules(id, unique);
    await this.audit.record({
      action: 'role.modules.changed', outcome: 'success', actorUserId: actorId, resourceType: 'role', resourceId: id, meta,
      metadata: { modules: found.map((m) => m.key).sort() },
    });
    return this.getRole(id);
  }

  async setPermissions(id: string, permissionIds: string[], actorId: string, meta: RequestMeta): Promise<RoleDetail> {
    const role = await this.requireModulesEditable(id);
    const unique = [...new Set(permissionIds)];
    const found = await this.catalog.findPermissionsByIds(unique);
    if (found.length !== unique.length) throw new AppException(ErrorCodes.RBAC_PERMISSION_NOT_FOUND);
    if (found.some((p) => p.moduleScope !== role.scope)) throw new AppException(ErrorCodes.RBAC_SCOPE_MISMATCH);
    await this.roles.replacePermissions(id, unique);
    await this.audit.record({
      action: 'role.permissions.changed', outcome: 'success', actorUserId: actorId, resourceType: 'role', resourceId: id, meta,
      metadata: { permissions: found.map((p) => p.code).sort() },
    });
    return this.getRole(id);
  }

  private async requireRole(id: string): Promise<Role> {
    const role = await this.roles.findById(id);
    if (!role) throw new AppException(ErrorCodes.RBAC_ROLE_NOT_FOUND);
    return role;
  }

  /** Identidad de un rol de sistema (código, nombre, MFA): no se renombra ni se borra. */
  private async requireNotSystem(id: string): Promise<Role> {
    const role = await this.requireRole(id);
    if (role.isSystem) throw new AppException(ErrorCodes.RBAC_ROLE_SYSTEM_PROTECTED);
    return role;
  }

  /**
   * Sus módulos/permisos sí se pueden editar aunque el rol sea de sistema (p. ej. `school_admin`
   * es una plantilla: la app nace sin módulos de colegio y el SuperAdmin se los asigna aquí).
   * Solo los roles bloqueados (`LOCKED_ROLE_CODES`) no pueden perder módulos.
   */
  private async requireModulesEditable(id: string): Promise<Role> {
    const role = await this.requireRole(id);
    if (LOCKED_ROLE_CODES.includes(role.code)) throw new AppException(ErrorCodes.RBAC_ROLE_LOCKED);
    return role;
  }
}
