import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { CLOCK, ClockPort } from '../../../shared/clock/clock.port';
import { IDENTITY_PROVISIONING, IdentityProvisioningPort } from '../../../shared/contracts/identity.contracts';
import { MEMBERSHIP_DIRECTORY, MembershipDirectoryPort } from '../../../shared/contracts/rbac.contracts';
import { TENANT_DIRECTORY, TenantDirectoryPort } from '../../../shared/contracts/tenant.contracts';
import { sha256Hex } from '../../../shared/crypto/crypto.ports';
import { TRANSACTION_RUNNER, TransactionRunnerPort } from '../../../shared/database/tx';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { OPERATOR_INVITATION_REPOSITORY, OperatorInvitationRepositoryPort } from '../domain/ports/operator-invitation.repository.port';

/** El invitado acepta y define su propia clave (ningún operador la conoce). Si el correo ya tenía cuenta, su clave NO cambia. */
@Injectable()
export class AcceptOperatorInvitationUseCase {
  constructor(
    @Inject(OPERATOR_INVITATION_REPOSITORY) private readonly invitations: OperatorInvitationRepositoryPort,
    @Inject(TENANT_DIRECTORY) private readonly tenants: TenantDirectoryPort,
    @Inject(IDENTITY_PROVISIONING) private readonly identity: IdentityProvisioningPort,
    @Inject(MEMBERSHIP_DIRECTORY) private readonly memberships: MembershipDirectoryPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
    @Inject(TRANSACTION_RUNNER) private readonly trx: TransactionRunnerPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(input: { token: string; password: string }, meta: RequestMeta): Promise<{ accountCreated: boolean }> {
    return this.trx.run(async (tx) => {
      const invitation = await this.invitations.consume(sha256Hex(input.token), this.clock.now(), tx);
      if (!invitation) throw new AppException(ErrorCodes.AUTH_INVITATION_INVALID);
      if (invitation.tenantId) {
        const tenant = await this.tenants.findBasic(invitation.tenantId);
        if (!tenant || tenant.status !== 'active') throw new AppException(ErrorCodes.AUTH_INVITATION_INVALID);
      }

      const { userId, created } = await this.identity.provisionUser({ email: invitation.email, password: input.password }, tx);
      await this.memberships.setRole(userId, invitation.tenantId, invitation.roleId, tx);
      await this.audit.record(
        {
          action: 'operator.invitation.accepted', outcome: 'success', actorUserId: userId, resourceType: 'user', resourceId: userId,
          tenantId: invitation.tenantId, meta, metadata: { accountCreated: created },
        },
        tx,
      );
      return { accountCreated: created };
    });
  }
}
