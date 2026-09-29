import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { USER_DIRECTORY, UserDirectoryPort } from '../../../shared/contracts/identity.contracts';
import { MEMBERSHIP_DIRECTORY, MembershipDirectoryPort, ROLE_DIRECTORY, RoleDirectoryPort } from '../../../shared/contracts/rbac.contracts';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { LastPlatformAdminGuard } from './last-platform-admin.guard';

/** Reemplaza el rol de un usuario dentro de un ámbito (plataforma o un colegio). */
@Injectable()
export class ChangeUserRoleUseCase {
  constructor(
    @Inject(MEMBERSHIP_DIRECTORY) private readonly memberships: MembershipDirectoryPort,
    @Inject(ROLE_DIRECTORY) private readonly roles: RoleDirectoryPort,
    @Inject(USER_DIRECTORY) private readonly users: UserDirectoryPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
    private readonly lastAdminGuard: LastPlatformAdminGuard,
  ) {}

  async execute(input: { userId: string; tenantId: string | null; roleId: string }, actorId: string, meta: RequestMeta): Promise<void> {
    const [role, [user]] = await Promise.all([this.roles.findById(input.roleId), this.users.listByIds([input.userId])]);
    if (!user) throw new AppException(ErrorCodes.USR_NOT_FOUND);
    if (!role) throw new AppException(ErrorCodes.RBAC_ROLE_NOT_FOUND);
    if ((role.scope === 'platform') !== (input.tenantId === null)) throw new AppException(ErrorCodes.RBAC_SCOPE_MISMATCH);
    if (input.tenantId === null) await this.lastAdminGuard.assertCanLoseSuperAdmin(input.userId);

    await this.memberships.setRole(input.userId, input.tenantId, role.id);
    await this.audit.record({
      action: 'user.role.changed', outcome: 'success', actorUserId: actorId, resourceType: 'user', resourceId: input.userId,
      tenantId: input.tenantId, meta, metadata: { roleCode: role.code },
    });
  }
}
