import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { CLOCK, ClockPort } from '../../../shared/clock/clock.port';
import { APP_CONFIG, AppConfig } from '../../../shared/config/env';
import { ROLE_DIRECTORY, RoleDirectoryPort } from '../../../shared/contracts/rbac.contracts';
import { TENANT_DIRECTORY, TenantDirectoryPort } from '../../../shared/contracts/tenant.contracts';
import { randomToken, sha256Hex } from '../../../shared/crypto/crypto.ports';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { OPERATOR_INVITATION_REPOSITORY, OperatorInvitationRepositoryPort } from '../domain/ports/operator-invitation.repository.port';
import { OPERATOR_NOTIFIER, OperatorNotifierPort } from '../domain/ports/operator-notifier.port';

/** Invita a un usuario a un rol existente: operador de plataforma (`tenantId = null`) o administrador adicional de un colegio. */
@Injectable()
export class InviteOperatorUseCase {
  constructor(
    @Inject(OPERATOR_INVITATION_REPOSITORY) private readonly invitations: OperatorInvitationRepositoryPort,
    @Inject(ROLE_DIRECTORY) private readonly roles: RoleDirectoryPort,
    @Inject(TENANT_DIRECTORY) private readonly tenants: TenantDirectoryPort,
    @Inject(OPERATOR_NOTIFIER) private readonly notifier: OperatorNotifierPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  async execute(input: { email: string; roleId: string; tenantId: string | null }, actorId: string, meta: RequestMeta): Promise<{ expiresAt: Date }> {
    const role = await this.roles.findById(input.roleId);
    if (!role) throw new AppException(ErrorCodes.RBAC_ROLE_NOT_FOUND);
    if ((role.scope === 'platform') !== (input.tenantId === null)) throw new AppException(ErrorCodes.RBAC_SCOPE_MISMATCH);

    let scopeLabel = 'Plataforma';
    if (input.tenantId) {
      const tenant = await this.tenants.findBasic(input.tenantId);
      if (!tenant || tenant.status !== 'active') throw new AppException(ErrorCodes.TEN_NOT_FOUND);
      scopeLabel = tenant.legalName;
    }

    const now = this.clock.now();
    const email = input.email.trim().toLowerCase();
    if (await this.invitations.hasPending(email, input.tenantId, now)) throw new AppException(ErrorCodes.USR_INVITATION_REDUNDANT);

    const token = randomToken(32);
    const expiresAt = new Date(now.getTime() + this.cfg.INVITATION_TTL_HOURS * 3_600_000);
    await this.invitations.create({ tenantId: input.tenantId, email, roleId: role.id, tokenHash: sha256Hex(token), expiresAt, createdBy: actorId });
    await this.audit.record({
      action: 'operator.invited', outcome: 'success', actorUserId: actorId, resourceType: 'user', resourceId: email,
      tenantId: input.tenantId, meta, metadata: { roleCode: role.code },
    });

    await this.notifier.sendOperatorInvitation({
      to: email, roleName: role.name, scopeLabel, expiresAt,
      acceptUrl: `${this.cfg.APP_PUBLIC_URL}/invitacion-operador?token=${token}`,
    });
    return { expiresAt };
  }
}
