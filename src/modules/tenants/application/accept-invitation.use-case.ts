import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { CLOCK, ClockPort } from '../../../shared/clock/clock.port';
import { IDENTITY_PROVISIONING, IdentityProvisioningPort } from '../../../shared/contracts/identity.contracts';
import { ROLE_ASSIGNMENT, RoleAssignmentPort } from '../../../shared/contracts/rbac.contracts';
import { sha256Hex } from '../../../shared/crypto/crypto.ports';
import { TRANSACTION_RUNNER, TransactionRunnerPort } from '../../../shared/database/tx';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { INVITATION_REPOSITORY, InvitationRepositoryPort } from '../domain/ports/invitation.repository.port';
import { TENANT_REPOSITORY, TenantRepositoryPort } from '../domain/ports/tenant.repository.port';

/**
 * El administrador del colegio acepta su invitación y define su propia clave (OWASP: credenciales
 * que ningún operador conoce). El token se consume de forma atómica; si la clave es débil, todo se
 * revierte y el mismo enlace sigue sirviendo. Si el correo ya tenía cuenta, su clave NO se modifica.
 */
@Injectable()
export class AcceptInvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY) private readonly invitations: InvitationRepositoryPort,
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepositoryPort,
    @Inject(IDENTITY_PROVISIONING) private readonly identity: IdentityProvisioningPort,
    @Inject(ROLE_ASSIGNMENT) private readonly assignment: RoleAssignmentPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
    @Inject(TRANSACTION_RUNNER) private readonly trx: TransactionRunnerPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(input: { token: string; password: string }, meta: RequestMeta): Promise<{ tenantSlug: string; accountCreated: boolean }> {
    return this.trx.run(async (tx) => {
      const invitation = await this.invitations.consume(sha256Hex(input.token), this.clock.now(), tx);
      if (!invitation) throw new AppException(ErrorCodes.AUTH_INVITATION_INVALID);
      const tenant = await this.tenants.findById(invitation.tenantId);
      if (!tenant || tenant.status !== 'active') throw new AppException(ErrorCodes.AUTH_INVITATION_INVALID);

      const { userId, created } = await this.identity.provisionUser({ email: invitation.email, password: input.password }, tx);
      await this.assignment.assign({ userId, roleId: invitation.roleId, tenantId: tenant.id }, tx);
      await this.audit.record(
        {
          action: 'tenant.invitation.accepted', outcome: 'success', actorUserId: userId, resourceType: 'tenant', resourceId: tenant.id,
          tenantId: tenant.id, meta, metadata: { accountCreated: created },
        },
        tx,
      );
      return { tenantSlug: tenant.slug, accountCreated: created };
    });
  }
}
