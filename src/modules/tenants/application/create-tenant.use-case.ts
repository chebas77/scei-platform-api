import { Inject, Injectable, Logger } from '@nestjs/common';
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
import { PLAN_REPOSITORY, PlanRepositoryPort } from '../domain/ports/plan.repository.port';
import { TENANT_KEY_STORE, TenantKeyStorePort } from '../domain/ports/tenant-key.store.port';
import { TENANT_REPOSITORY, TenantRepositoryPort } from '../domain/ports/tenant.repository.port';
import { Tenant } from '../domain/tenant';

export interface CreateTenantInput {
  slug: string;
  legalName: string;
  ruc?: string;
  planId: string;
  adminEmail: string;
}

export const SCHOOL_ADMIN_ROLE_CODE = 'school_admin';

/**
 * PL-01. Crea el colegio, su clave de datos propia y una invitación de un solo uso para su administrador.
 * El SuperAdmin nunca conoce ni fija la contraseña del administrador del colegio: la define él al aceptar.
 */
@Injectable()
export class CreateTenantUseCase {
  private readonly log = new Logger(CreateTenantUseCase.name);

  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepositoryPort,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepositoryPort,
    @Inject(INVITATION_REPOSITORY) private readonly invitations: InvitationRepositoryPort,
    @Inject(TENANT_KEY_STORE) private readonly keys: TenantKeyStorePort,
    @Inject(ROLE_DIRECTORY) private readonly roles: RoleDirectoryPort,
    @Inject(NOTIFIER) private readonly notifier: NotifierPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
    @Inject(TRANSACTION_RUNNER) private readonly trx: TransactionRunnerPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  async execute(input: CreateTenantInput, actorId: string, meta: RequestMeta): Promise<{ tenant: Tenant; invitationExpiresAt: Date }> {
    const plan = await this.plans.findById(input.planId);
    if (!plan) throw new AppException(ErrorCodes.PLAN_NOT_FOUND);
    if (!plan.isActive) throw new AppException(ErrorCodes.PLAN_INACTIVE);
    const role = await this.roles.findSystemRole(SCHOOL_ADMIN_ROLE_CODE);
    if (!role) throw new Error(`Falta el rol ${SCHOOL_ADMIN_ROLE_CODE}: ejecuta las migraciones`);

    const email = input.adminEmail.trim().toLowerCase();
    const token = randomToken(32);
    const expiresAt = new Date(this.clock.now().getTime() + this.cfg.INVITATION_TTL_HOURS * 3_600_000);

    const tenant = await this.trx.run(async (tx) => {
      const created = await this.tenants.create(
        { slug: input.slug, legalName: input.legalName.trim(), ruc: input.ruc ?? null, planId: plan.id, createdBy: actorId },
        tx,
      );
      if (!created.ok) throw new AppException(created.conflict === 'ruc' ? ErrorCodes.TEN_RUC_TAKEN : ErrorCodes.TEN_SLUG_TAKEN);
      const { keyVersion } = await this.keys.provision(created.tenant.id, tx);
      await this.invitations.create(
        { tenantId: created.tenant.id, email, roleId: role.id, tokenHash: sha256Hex(token), expiresAt, createdBy: actorId },
        tx,
      );
      await this.audit.record(
        {
          action: 'tenant.created', outcome: 'success', actorUserId: actorId, resourceType: 'tenant', resourceId: created.tenant.id,
          tenantId: created.tenant.id, meta, metadata: { slug: created.tenant.slug, planCode: plan.code, keyVersion },
        },
        tx,
      );
      return created.tenant;
    });

    // Fuera de la transacción: si el correo falla, el colegio existe y se puede reenviar la invitación.
    await this.notifier
      .sendTenantInvitation({ to: email, legalName: tenant.legalName, acceptUrl: `${this.cfg.APP_PUBLIC_URL}/invitacion?token=${token}`, expiresAt })
      .catch((err) => this.log.error(`No se pudo enviar la invitación del colegio ${tenant.slug}: ${(err as Error).message}`));

    return { tenant, invitationExpiresAt: expiresAt };
  }
}
