import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '../../../shared/clock/clock.port';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { UsageSnapshot } from '../domain/plan';
import { PLAN_REPOSITORY, PlanRepositoryPort, USAGE_REPOSITORY, UsageRepositoryPort } from '../domain/ports/plan.repository.port';
import { TENANT_REPOSITORY, TenantRepositoryPort } from '../domain/ports/tenant.repository.port';
import { TenantStatus } from '../domain/tenant';

const NEAR_LIMIT = 0.9;
const STALE_HOURS = 48;

export interface PlatformOverview {
  tenantsByStatus: Record<TenantStatus, number>;
  totals: { students: number; kiosks: number };
  tenantsNearLimit: number;
  tenantsWithoutRecentData: number;
  generatedAt: Date;
}
export interface TenantHealth {
  tenantId: string;
  status: TenantStatus;
  planCode: string | null;
  usage: UsageSnapshot | null;
  studentsUsagePct: number | null;
  kiosksUsagePct: number | null;
  nearLimit: boolean;
  stale: boolean;
}

/** PL-05: métricas AGREGADAS. Nunca contienen alumnos, marcas ni datos personales. */
@Injectable()
export class MetricsService {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepositoryPort,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepositoryPort,
    @Inject(USAGE_REPOSITORY) private readonly usage: UsageRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async overview(): Promise<PlatformOverview> {
    const [byStatus, latest, planList] = await Promise.all([this.tenants.countByStatus(), this.usage.latestOfEveryLiveTenant(), this.plans.list()]);
    // Solo se evalúa contra su plan a los colegios con dato; el resto cuenta como "sin datos recientes".
    const now = this.clock.now().getTime();
    const plans = new Map(planList.map((p) => [p.id, p]));
    let near = 0;
    let students = 0;
    let kiosks = 0;
    let fresh = 0;
    for (const { planId, snapshot } of latest) {
      students += snapshot.studentsCount;
      kiosks += snapshot.kiosksCount;
      if (now - snapshot.capturedAt.getTime() <= STALE_HOURS * 3_600_000) fresh += 1;
      const plan = plans.get(planId);
      if (plan && (snapshot.studentsCount >= plan.maxStudents * NEAR_LIMIT || snapshot.kiosksCount >= plan.maxKiosks * NEAR_LIMIT)) near += 1;
    }
    const liveCount = byStatus.active + byStatus.suspended;
    return {
      tenantsByStatus: byStatus,
      totals: { students, kiosks },
      tenantsNearLimit: near,
      tenantsWithoutRecentData: Math.max(0, liveCount - fresh),
      generatedAt: this.clock.now(),
    };
  }

  async tenantHealth(tenantId: string): Promise<TenantHealth> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) throw new AppException(ErrorCodes.TEN_NOT_FOUND);
    const [plan, usage] = await Promise.all([this.plans.findById(tenant.planId), this.usage.latestFor(tenantId)]);
    const pct = (used: number | undefined, max: number | undefined) => (used === undefined || !max ? null : Math.round((used / max) * 1000) / 10);
    const students = pct(usage?.studentsCount, plan?.maxStudents);
    const kiosks = pct(usage?.kiosksCount, plan?.maxKiosks);
    return {
      tenantId, status: tenant.status, planCode: plan?.code ?? null, usage,
      studentsUsagePct: students, kiosksUsagePct: kiosks,
      nearLimit: (students ?? 0) >= NEAR_LIMIT * 100 || (kiosks ?? 0) >= NEAR_LIMIT * 100,
      stale: !usage || this.clock.now().getTime() - usage.capturedAt.getTime() > STALE_HOURS * 3_600_000,
    };
  }
}
