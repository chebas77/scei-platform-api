import { Inject, Injectable } from '@nestjs/common';
import { MfaPolicyPort, RoleAssignmentPort, RoleDirectoryPort, TenantAccessRevokerPort } from '../../../shared/contracts/rbac.contracts';
import { Tx } from '../../../shared/database/tx';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { PermissionResolverPort } from '../../../shared/security/auth-context';
import { ACCESS_REPOSITORY, AccessRepositoryPort } from '../domain/ports/access.repository.port';

/** Implementa los contratos que RBAC ofrece a los demás módulos (permisos, roles del sistema, política MFA). */
@Injectable()
export class RbacAccessService implements PermissionResolverPort, RoleDirectoryPort, RoleAssignmentPort, MfaPolicyPort, TenantAccessRevokerPort {
  constructor(@Inject(ACCESS_REPOSITORY) private readonly access: AccessRepositoryPort) {}

  async resolve(userId: string, tenantId: string | null): Promise<ReadonlySet<string>> {
    return new Set(await this.access.effectivePermissionCodes(userId, tenantId));
  }

  findSystemRole(code: string) {
    return this.access.findSystemRole(code);
  }

  async assign(input: { userId: string; roleId: string; tenantId: string | null }, tx?: Tx): Promise<void> {
    const scope = await this.access.findRoleScope(input.roleId);
    if (!scope) throw new AppException(ErrorCodes.RBAC_ROLE_NOT_FOUND);
    // Un rol de plataforma solo va sin colegio; uno de colegio siempre con colegio.
    if ((scope === 'platform') !== (input.tenantId === null)) throw new AppException(ErrorCodes.RBAC_SCOPE_MISMATCH);
    await this.access.assign(input, tx);
  }

  revokeAllForTenant(tenantId: string, tx?: Tx): Promise<number> {
    return this.access.revokeAllForTenant(tenantId, tx);
  }

  isMfaRequired(userId: string): Promise<boolean> {
    return this.access.anyRoleRequiresMfa(userId);
  }
}
