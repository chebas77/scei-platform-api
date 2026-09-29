import { Inject, Injectable } from '@nestjs/common';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { Page } from '../../../shared/http/pagination';
import { Plan, UsageSnapshot } from '../domain/plan';
import { INVITATION_REPOSITORY, InvitationRepositoryPort, TenantInvitation } from '../domain/ports/invitation.repository.port';
import { PLAN_REPOSITORY, PlanRepositoryPort, USAGE_REPOSITORY, UsageRepositoryPort } from '../domain/ports/plan.repository.port';
import { TENANT_REPOSITORY, TenantRepositoryPort } from '../domain/ports/tenant.repository.port';
import { Tenant, TenantStatus } from '../domain/tenant';

export interface TenantView {
  tenant: Tenant;
  plan: Plan | null;
  usage: UsageSnapshot | null;
}
export interface TenantDetailView extends TenantView {
  invitations: TenantInvitation[];
}

@Injectable()
export class TenantQueryService {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepositoryPort,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepositoryPort,
    @Inject(USAGE_REPOSITORY) private readonly usage: UsageRepositoryPort,
    @Inject(INVITATION_REPOSITORY) private readonly invitations: InvitationRepositoryPort,
  ) {}

  async list(filter: { status?: TenantStatus; search?: string; page: number; pageSize: number }): Promise<Page<TenantView>> {
    const page = await this.tenants.list(filter);
    const [plans, usage] = await Promise.all([
      this.plans.findByIds([...new Set(page.items.map((t) => t.planId))]),
      this.usage.latestForMany(page.items.map((t) => t.id)),
    ]);
    const byPlan = new Map(plans.map((p) => [p.id, p]));
    return { ...page, items: page.items.map((tenant) => ({ tenant, plan: byPlan.get(tenant.planId) ?? null, usage: usage.get(tenant.id) ?? null })) };
  }

  async get(id: string): Promise<TenantDetailView> {
    const tenant = await this.tenants.findById(id);
    if (!tenant) throw new AppException(ErrorCodes.TEN_NOT_FOUND);
    const [plan, usage, invitations] = await Promise.all([
      this.plans.findById(tenant.planId), this.usage.latestFor(id), this.invitations.listByTenant(id),
    ]);
    return { tenant, plan, usage, invitations };
  }
}
