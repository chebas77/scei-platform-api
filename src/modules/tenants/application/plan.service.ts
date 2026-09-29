import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { limitViolations, NewPlan, Plan } from '../domain/plan';
import { PLAN_REPOSITORY, PlanRepositoryPort, USAGE_REPOSITORY, UsageRepositoryPort } from '../domain/ports/plan.repository.port';
import { TENANT_REPOSITORY, TenantRepositoryPort } from '../domain/ports/tenant.repository.port';

export interface PlanWithCount extends Plan {
  tenantCount: number;
}

/** Planes y límites (PL-02). Los límites los valida la API, no el front. */
@Injectable()
export class PlanService {
  constructor(
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepositoryPort,
    @Inject(USAGE_REPOSITORY) private readonly usage: UsageRepositoryPort,
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepositoryPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
  ) {}

  async list(): Promise<PlanWithCount[]> {
    const [plans, counts] = await Promise.all([this.plans.list(), this.plans.tenantCountsByPlan()]);
    return plans.map((p) => ({ ...p, tenantCount: counts[p.id] ?? 0 }));
  }

  async create(input: NewPlan, actorId: string, meta: RequestMeta): Promise<Plan> {
    const plan = await this.plans.create({ ...input, code: input.code.trim().toLowerCase() });
    if (!plan) throw new AppException(ErrorCodes.PLAN_CODE_TAKEN);
    await this.audit.record({
      action: 'plan.created', outcome: 'success', actorUserId: actorId, resourceType: 'plan', resourceId: plan.id, meta,
      metadata: { code: plan.code, maxStudents: plan.maxStudents, maxKiosks: plan.maxKiosks, retentionDays: plan.retentionDays },
    });
    return plan;
  }

  async update(
    id: string,
    patch: Partial<Pick<Plan, 'name' | 'maxStudents' | 'maxKiosks' | 'retentionDays' | 'isActive'>>,
    actorId: string,
    meta: RequestMeta,
  ): Promise<Plan> {
    const current = await this.plans.findById(id);
    if (!current) throw new AppException(ErrorCodes.PLAN_NOT_FOUND);

    const next = { maxStudents: patch.maxStudents ?? current.maxStudents, maxKiosks: patch.maxKiosks ?? current.maxKiosks };
    if (next.maxStudents < current.maxStudents || next.maxKiosks < current.maxKiosks) {
      // Bajar límites no puede dejar a un colegio vigente por encima de su plan.
      const ids = await this.tenants.liveIdsByPlan(id);
      const snapshots = await this.usage.latestForMany(ids);
      const offenders = [...snapshots.values()].filter((s) => limitViolations(next, s).length > 0).length;
      if (offenders > 0) {
        throw new AppException(ErrorCodes.PLAN_LIMIT_BELOW_USAGE, [{ message: `${offenders} colegio(s) superan los nuevos límites` }]);
      }
    }
    const updated = await this.plans.update(id, patch);
    if (!updated) throw new AppException(ErrorCodes.PLAN_NOT_FOUND);
    await this.audit.record({
      action: 'plan.updated', outcome: 'success', actorUserId: actorId, resourceType: 'plan', resourceId: id, meta,
      metadata: { fields: Object.keys(patch), ...patch },
    });
    return updated;
  }
}
