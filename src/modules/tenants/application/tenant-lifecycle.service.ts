import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { CLOCK, ClockPort } from '../../../shared/clock/clock.port';
import { APP_CONFIG, AppConfig } from '../../../shared/config/env';
import { TENANT_ACCESS_REVOKER, TenantAccessRevokerPort } from '../../../shared/contracts/rbac.contracts';
import { SIGNER, SignerPort } from '../../../shared/crypto/crypto.ports';
import { Tx, TRANSACTION_RUNNER, TransactionRunnerPort } from '../../../shared/database/tx';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { limitViolations } from '../domain/plan';
import { CERTIFICATE_REPOSITORY, CertificateRepositoryPort, DeletionCertificate } from '../domain/ports/certificate.repository.port';
import { INVITATION_REPOSITORY, InvitationRepositoryPort } from '../domain/ports/invitation.repository.port';
import { PLAN_REPOSITORY, PlanRepositoryPort, USAGE_REPOSITORY, UsageRepositoryPort } from '../domain/ports/plan.repository.port';
import { TENANT_KEY_STORE, TenantKeyStorePort } from '../domain/ports/tenant-key.store.port';
import { TENANT_REPOSITORY, TenantRepositoryPort } from '../domain/ports/tenant.repository.port';
import { graceEndsAt, nextStatus, Tenant, TenantAction } from '../domain/tenant';
import { TenantDataPurgerRegistry } from './tenant-data-purger.registry';

const canonical = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const o = value as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
};

/** PL-02 (asignar plan), PL-03 (suspender/reactivar) y PL-04 (baja + purga con constancia). */
@Injectable()
export class TenantLifecycleService {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepositoryPort,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepositoryPort,
    @Inject(USAGE_REPOSITORY) private readonly usage: UsageRepositoryPort,
    @Inject(INVITATION_REPOSITORY) private readonly invitations: InvitationRepositoryPort,
    @Inject(TENANT_KEY_STORE) private readonly keys: TenantKeyStorePort,
    @Inject(CERTIFICATE_REPOSITORY) private readonly certificates: CertificateRepositoryPort,
    @Inject(TENANT_ACCESS_REVOKER) private readonly access: TenantAccessRevokerPort,
    @Inject(SIGNER) private readonly signer: SignerPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
    @Inject(TRANSACTION_RUNNER) private readonly trx: TransactionRunnerPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    private readonly purgers: TenantDataPurgerRegistry,
  ) {}

  async assignPlan(tenantId: string, planId: string, actorId: string, meta: RequestMeta): Promise<Tenant> {
    return this.trx.run(async (tx) => {
      const tenant = await this.lock(tenantId, tx);
      nextStatus(tenant.status, 'change_plan');
      const plan = await this.plans.findById(planId);
      if (!plan) throw new AppException(ErrorCodes.PLAN_NOT_FOUND);
      if (!plan.isActive) throw new AppException(ErrorCodes.PLAN_INACTIVE);
      const problems = limitViolations(plan, await this.usage.latestFor(tenantId));
      if (problems.length) throw new AppException(ErrorCodes.PLAN_LIMIT_BELOW_USAGE, problems.map((message) => ({ message })));

      const updated = await this.tenants.update(tenantId, { planId }, tx);
      await this.audit.record(
        { action: 'tenant.plan.changed', outcome: 'success', actorUserId: actorId, resourceType: 'tenant', resourceId: tenantId, tenantId, meta,
          metadata: { fromPlanId: tenant.planId, toPlanId: planId, toPlanCode: plan.code } },
        tx,
      );
      return updated;
    });
  }

  suspend(tenantId: string, reason: string, actorId: string, meta: RequestMeta): Promise<Tenant> {
    return this.transition(tenantId, 'suspend', actorId, meta, () => ({
      patch: { suspendedAt: this.clock.now(), suspensionReason: reason },
      metadata: { reason },
    }));
  }

  reactivate(tenantId: string, actorId: string, meta: RequestMeta): Promise<Tenant> {
    return this.transition(tenantId, 'reactivate', actorId, meta, () => ({ patch: { suspendedAt: null, suspensionReason: null } }));
  }

  requestOffboarding(tenantId: string, actorId: string, meta: RequestMeta): Promise<Tenant> {
    return this.transition(
      tenantId,
      'request_deletion',
      actorId,
      meta,
      (tenant) => ({
        patch: { suspendedAt: tenant.suspendedAt ?? this.clock.now(), deletionRequestedAt: this.clock.now(), deletionRequestedBy: actorId },
        metadata: { graceDays: this.cfg.TENANT_PURGE_GRACE_DAYS },
      }),
      async (tx) => void (await this.invitations.revokePending(tenantId, this.clock.now(), tx)),
    );
  }

  cancelOffboarding(tenantId: string, actorId: string, meta: RequestMeta): Promise<Tenant> {
    return this.transition(tenantId, 'cancel_deletion', actorId, meta, () => ({ patch: { deletionRequestedAt: null, deletionRequestedBy: null } }));
  }

  /** Baja definitiva: borra datos vía purgadores, destruye la clave del colegio y emite constancia firmada. */
  async purge(tenantId: string, confirmSlug: string, actorId: string, meta: RequestMeta): Promise<DeletionCertificate> {
    return this.trx.run(async (tx) => {
      const tenant = await this.lock(tenantId, tx);
      nextStatus(tenant.status, 'purge');
      if (confirmSlug !== tenant.slug) throw new AppException(ErrorCodes.TEN_PURGE_CONFIRMATION_MISMATCH);

      const now = this.clock.now();
      const requestedAt = tenant.deletionRequestedAt ?? now;
      const eligibleAt = graceEndsAt(requestedAt, this.cfg.TENANT_PURGE_GRACE_DAYS);
      if (now < eligibleAt) {
        throw new AppException(ErrorCodes.TEN_PURGE_GRACE_PERIOD, [{ field: 'eligibleAt', message: eligibleAt.toISOString() }]);
      }

      const purged: { name: string; deleted: number }[] = [];
      for (const purger of this.purgers.all()) purged.push({ name: purger.name, ...(await purger.purge(tenantId, tx)) });
      purged.push({ name: 'usage_snapshots', deleted: await this.usage.deleteForTenant(tenantId, tx) });
      purged.push({ name: 'memberships', deleted: await this.access.revokeAllForTenant(tenantId, tx) });
      await this.invitations.revokePending(tenantId, now, tx);
      const key = await this.keys.destroy(tenantId, now, tx);

      await this.tenants.update(tenantId, { status: 'purged', purgedAt: now }, tx);

      const payload = {
        certificateVersion: 1,
        tenantId,
        tenantSlug: tenant.slug,
        legalName: tenant.legalName,
        ruc: tenant.ruc,
        deletionRequestedAt: requestedAt.toISOString(),
        purgedAt: now.toISOString(),
        method: 'crypto-shredding+row-deletion',
        keyDestroyed: key !== null,
        keyVersion: key?.keyVersion ?? null,
        purged,
      };
      const certificate = await this.certificates.create(
        {
          tenantId, tenantSlug: tenant.slug, legalName: tenant.legalName, purgedAt: now, payload,
          signature: this.signer.sign(canonical(payload)), requestedBy: tenant.deletionRequestedBy, purgedBy: actorId,
        },
        tx,
      );
      await this.audit.record(
        { action: 'tenant.purged', outcome: 'success', actorUserId: actorId, resourceType: 'tenant', resourceId: tenantId, tenantId, meta,
          metadata: { slug: tenant.slug, certificateId: certificate.id, purged } },
        tx,
      );
      return certificate;
    });
  }

  async getCertificate(tenantId: string): Promise<{ certificate: DeletionCertificate; signatureValid: boolean }> {
    const certificate = await this.certificates.findByTenant(tenantId);
    if (!certificate) throw new AppException(ErrorCodes.TEN_CERTIFICATE_NOT_FOUND);
    return { certificate, signatureValid: this.signer.verify(canonical(certificate.payload), certificate.signature) };
  }

  // ── internos ────────────────────────────────────────────────────────────
  private async lock(tenantId: string, tx: Tx): Promise<Tenant> {
    const tenant = await this.tenants.findByIdForUpdate(tenantId, tx);
    if (!tenant) throw new AppException(ErrorCodes.TEN_NOT_FOUND);
    return tenant;
  }

  private transition(
    tenantId: string,
    action: TenantAction,
    actorId: string,
    meta: RequestMeta,
    build: (tenant: Tenant) => { patch: Parameters<TenantRepositoryPort['update']>[1]; metadata?: Record<string, unknown> },
    extra?: (tx: Tx) => Promise<void>,
  ): Promise<Tenant> {
    return this.trx.run(async (tx) => {
      const tenant = await this.lock(tenantId, tx);
      const status = nextStatus(tenant.status, action);
      const { patch, metadata } = build(tenant);
      const updated = await this.tenants.update(tenantId, { ...patch, status }, tx);
      if (extra) await extra(tx);
      await this.audit.record(
        { action: `tenant.${action}`, outcome: 'success', actorUserId: actorId, resourceType: 'tenant', resourceId: tenantId, tenantId, meta,
          metadata: { from: tenant.status, to: status, ...metadata } },
        tx,
      );
      return updated;
    });
  }
}
