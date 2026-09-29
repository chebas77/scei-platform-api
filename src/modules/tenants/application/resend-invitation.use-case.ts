import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { CLOCK, ClockPort } from '../../../shared/clock/clock.port';
import { APP_CONFIG, AppConfig } from '../../../shared/config/env';
import { ROLE_DIRECTORY, RoleDirectoryPort } from '../../../shared/contracts/rbac.contracts';
import { randomToken, sha256Hex } from '../../../shared/crypto/crypto.ports';
import { TRANSACTION_RUNNER, TransactionRunnerPort } from '../../../shared/database/tx';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { INVITATION_REPOSITORY, InvitationRepositoryPort } from '../domain/ports/invitation.repository.port';
import { NOTIFIER, NotifierPort } from '../domain/ports/notifier.port';
import { TENANT_REPOSITORY, TenantRepositoryPort } from '../domain/ports/tenant.repository.port';
import { SCHOOL_ADMIN_ROLE_CODE } from './create-tenant.use-case';

/** Revoca las invitaciones pendientes y emite una nueva (p. ej. el enlace venció o el correo se perdió). */
@Injectable()
export class ResendInvitationUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepositoryPort,
    @Inject(INVITATION_REPOSITORY) private readonly invitations: InvitationRepositoryPort,
    @Inject(ROLE_DIRECTORY) private readonly roles: RoleDirectoryPort,
    @Inject(NOTIFIER) private readonly notifier: NotifierPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
    @Inject(TRANSACTION_RUNNER) private readonly trx: TransactionRunnerPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  async execute(tenantId: string, adminEmail: string, actorId: string, meta: RequestMeta): Promise<{ expiresAt: Date }> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) throw new AppException(ErrorCodes.TEN_NOT_FOUND);
    if (tenant.status !== 'active') throw new AppException(ErrorCodes.TEN_INVALID_STATE);
    const role = await this.roles.findSystemRole(SCHOOL_ADMIN_ROLE_CODE);
    if (!role) throw new Error(`Falta el rol ${SCHOOL_ADMIN_ROLE_CODE}`);

    const now = this.clock.now();
    const email = adminEmail.trim().toLowerCase();
    const token = randomToken(32);
    const expiresAt = new Date(now.getTime() + this.cfg.INVITATION_TTL_HOURS * 3_600_000);

    await this.trx.run(async (tx) => {
      await this.invitations.revokePending(tenantId, now, tx);
      await this.invitations.create({ tenantId, email, roleId: role.id, tokenHash: sha256Hex(token), expiresAt, createdBy: actorId }, tx);
      await this.audit.record({ action: 'tenant.invitation.resent', outcome: 'success', actorUserId: actorId, resourceType: 'tenant', resourceId: tenantId, tenantId, meta }, tx);
    });
    await this.notifier.sendTenantInvitation({ to: email, legalName: tenant.legalName, acceptUrl: `${this.cfg.APP_PUBLIC_URL}/invitacion?token=${token}`, expiresAt });
    return { expiresAt };
  }
}
