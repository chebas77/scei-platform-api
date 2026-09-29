import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort } from '../../../shared/audit/audit-recorder.port';
import { IDENTITY_PROVISIONING, IdentityProvisioningPort } from '../../../shared/contracts/identity.contracts';
import { ROLE_ASSIGNMENT, ROLE_DIRECTORY, RoleAssignmentPort, RoleDirectoryPort } from '../../../shared/contracts/rbac.contracts';

/** Alta del primer SuperAdmin (uso por CLI). El acceso real exige además enrolar MFA en el primer login. */
@Injectable()
export class CreatePlatformAdminUseCase {
  constructor(
    @Inject(IDENTITY_PROVISIONING) private readonly identity: IdentityProvisioningPort,
    @Inject(ROLE_DIRECTORY) private readonly roles: RoleDirectoryPort,
    @Inject(ROLE_ASSIGNMENT) private readonly assignment: RoleAssignmentPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
  ) {}

  async execute(input: { email: string; password: string }): Promise<{ userId: string; created: boolean }> {
    const role = await this.roles.findSystemRole('platform_superadmin');
    if (!role) throw new Error('Falta el rol platform_superadmin: ejecuta primero las migraciones');
    const { userId, created } = await this.identity.provisionUser(input);
    await this.assignment.assign({ userId, roleId: role.id, tenantId: null });
    await this.audit.record({
      action: 'platform_admin.provisioned',
      outcome: 'success',
      actorType: 'system',
      resourceType: 'user',
      resourceId: userId,
      metadata: { created },
    });
    return { userId, created };
  }
}
