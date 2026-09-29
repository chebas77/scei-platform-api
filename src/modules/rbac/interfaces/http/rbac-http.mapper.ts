import { LOCKED_ROLE_CODES, ModuleWithPermissions, Role, RoleSummary } from '../../domain/rbac.types';
import { RoleDetail } from '../../application/role-management.service';
import { ModuleResponseDto, RoleDetailResponseDto, RoleResponseDto, RoleSummaryResponseDto } from './dto/rbac.response.dto';

export const RbacHttpMapper = {
  toModule({ module, permissions }: ModuleWithPermissions): ModuleResponseDto {
    return {
      id: module.id, key: module.key, name: module.name, description: module.description, scope: module.scope, isActive: module.isActive,
      permissions: permissions.map((p) => ({ id: p.id, code: p.code, description: p.description, endpoints: p.endpoints, isActive: p.isActive })),
    };
  },
  toRole(r: Role): RoleResponseDto {
    return {
      id: r.id, code: r.code, name: r.name, description: r.description, scope: r.scope,
      isSystem: r.isSystem, modulesLocked: LOCKED_ROLE_CODES.includes(r.code), requiresMfa: r.requiresMfa, createdAt: r.createdAt.toISOString(),
    };
  },
  toRoleSummary(r: RoleSummary): RoleSummaryResponseDto {
    return { ...RbacHttpMapper.toRole(r), moduleCount: r.moduleCount, permissionCount: r.permissionCount };
  },
  toRoleDetail(d: RoleDetail): RoleDetailResponseDto {
    return { ...RbacHttpMapper.toRole(d.role), moduleIds: d.moduleIds, permissionIds: d.permissionIds, effectivePermissions: d.effectivePermissions };
  },
};
