import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { TENANT_DIRECTORY, TenantDirectoryPort } from '../../../shared/contracts/tenant.contracts';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { Kiosk } from '../domain/kiosk';
import { KIOSK_REPOSITORY, KioskRepositoryPort } from '../domain/ports/kiosk.repository.port';

/** Kioscos de un colegio: el plan del colegio limita cuántos puede tener activos a la vez. */
@Injectable()
export class KioskService {
  constructor(
    @Inject(KIOSK_REPOSITORY) private readonly kiosks: KioskRepositoryPort,
    @Inject(TENANT_DIRECTORY) private readonly tenants: TenantDirectoryPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
  ) {}

  list(tenantId: string): Promise<Kiosk[]> {
    return this.kiosks.listByTenant(tenantId);
  }

  async create(tenantId: string, input: { code: string; name: string }, actorId: string, meta: RequestMeta): Promise<Kiosk> {
    const limits = await this.tenants.getPlanLimits(tenantId);
    const activeCount = await this.kiosks.countActiveByTenant(tenantId);
    if (limits && activeCount >= limits.maxKiosks) throw new AppException(ErrorCodes.KIO_LIMIT_REACHED);

    const kiosk = await this.kiosks.create({ tenantId, code: input.code.trim(), name: input.name.trim() });
    if (!kiosk) throw new AppException(ErrorCodes.KIO_CODE_TAKEN);
    await this.audit.record({
      action: 'kiosk.created', outcome: 'success', actorUserId: actorId, resourceType: 'kiosk', resourceId: kiosk.id, tenantId, meta,
      metadata: { code: kiosk.code },
    });
    return kiosk;
  }

  async update(
    tenantId: string, id: string, patch: { name?: string; status?: 'active' | 'inactive' }, actorId: string, meta: RequestMeta,
  ): Promise<Kiosk> {
    const current = await this.requireOwnedKiosk(tenantId, id);
    if (patch.status === 'active' && current.status === 'inactive') {
      const limits = await this.tenants.getPlanLimits(tenantId);
      const activeCount = await this.kiosks.countActiveByTenant(tenantId);
      if (limits && activeCount >= limits.maxKiosks) throw new AppException(ErrorCodes.KIO_LIMIT_REACHED);
    }
    const updated = await this.kiosks.update(id, patch);
    if (!updated) throw new AppException(ErrorCodes.KIO_NOT_FOUND);
    await this.audit.record({
      action: 'kiosk.updated', outcome: 'success', actorUserId: actorId, resourceType: 'kiosk', resourceId: id, tenantId, meta,
      metadata: { fields: Object.keys(patch) },
    });
    return updated;
  }

  async remove(tenantId: string, id: string, actorId: string, meta: RequestMeta): Promise<void> {
    await this.requireOwnedKiosk(tenantId, id);
    await this.kiosks.delete(id);
    await this.audit.record({ action: 'kiosk.deleted', outcome: 'success', actorUserId: actorId, resourceType: 'kiosk', resourceId: id, tenantId, meta });
  }

  /** Nunca deja operar sobre un kiosco de otro colegio, aunque alguien adivine su id. */
  private async requireOwnedKiosk(tenantId: string, id: string): Promise<Kiosk> {
    const kiosk = await this.kiosks.findById(id);
    if (!kiosk || kiosk.tenantId !== tenantId) throw new AppException(ErrorCodes.KIO_NOT_FOUND);
    return kiosk;
  }
}
