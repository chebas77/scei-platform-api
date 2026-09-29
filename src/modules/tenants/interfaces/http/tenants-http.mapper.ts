import { Plan, UsageSnapshot } from '../../domain/plan';
import { DeletionCertificate } from '../../domain/ports/certificate.repository.port';
import { TenantInvitation } from '../../domain/ports/invitation.repository.port';
import { Tenant } from '../../domain/tenant';
import { PlatformOverview, TenantHealth } from '../../application/metrics.service';
import { PlanWithCount } from '../../application/plan.service';
import { TenantDetailView, TenantView } from '../../application/tenant-query.service';
import { PlanListItemResponseDto, PlanResponseDto } from './dto/plans.dto';
import {
  DeletionCertificateResponseDto, InvitationResponseDto, PlatformOverviewResponseDto, TenantDetailResponseDto,
  TenantHealthResponseDto, TenantResponseDto, UsageResponseDto,
} from './dto/tenants.response.dto';

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
const maskEmail = (e: string): string => e.replace(/^(.).*(@.*)$/, '$1***$2');

const usage = (u: UsageSnapshot | null): UsageResponseDto | null =>
  u ? { capturedAt: u.capturedAt.toISOString(), studentsCount: u.studentsCount, kiosksCount: u.kiosksCount, apiP95Ms: u.apiP95Ms, queueDepth: u.queueDepth, errorRate: u.errorRate } : null;

const invitationState = (i: TenantInvitation, now: Date): string =>
  i.acceptedAt ? 'accepted' : i.revokedAt ? 'revoked' : i.expiresAt <= now ? 'expired' : 'pending';

export const TenantsHttpMapper = {
  toPlan(p: Plan): PlanResponseDto {
    return { id: p.id, code: p.code, name: p.name, maxStudents: p.maxStudents, maxKiosks: p.maxKiosks, retentionDays: p.retentionDays,
      isActive: p.isActive, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() };
  },
  toPlanListItem(p: PlanWithCount): PlanListItemResponseDto {
    return { ...TenantsHttpMapper.toPlan(p), tenantCount: p.tenantCount };
  },
  toTenant(v: TenantView): TenantResponseDto {
    const t = v.tenant;
    return {
      id: t.id, slug: t.slug, legalName: t.legalName, ruc: t.ruc, status: t.status,
      plan: v.plan ? { id: v.plan.id, code: v.plan.code, name: v.plan.name, maxStudents: v.plan.maxStudents, maxKiosks: v.plan.maxKiosks } : null,
      usage: usage(v.usage), suspendedAt: iso(t.suspendedAt), suspensionReason: t.suspensionReason,
      deletionRequestedAt: iso(t.deletionRequestedAt), purgedAt: iso(t.purgedAt), createdAt: t.createdAt.toISOString(),
    };
  },
  toTenantDetail(v: TenantDetailView, now: Date): TenantDetailResponseDto {
    return {
      ...TenantsHttpMapper.toTenant(v),
      invitations: v.invitations.map((i) => ({ id: i.id, email: maskEmail(i.email), state: invitationState(i, now), expiresAt: i.expiresAt.toISOString(), createdAt: i.createdAt.toISOString() } satisfies InvitationResponseDto)),
    };
  },
  /** Para respuestas de acciones donde no se recarga plan/uso. */
  toTenantBare(t: Tenant): TenantResponseDto {
    return TenantsHttpMapper.toTenant({ tenant: t, plan: null, usage: null });
  },
  toCertificate(c: DeletionCertificate, signatureValid: boolean): DeletionCertificateResponseDto {
    return { id: c.id, tenantSlug: c.tenantSlug, legalName: c.legalName, purgedAt: c.purgedAt.toISOString(), payload: c.payload, signature: c.signature, signatureValid };
  },
  toOverview(o: PlatformOverview): PlatformOverviewResponseDto {
    return { tenantsByStatus: o.tenantsByStatus, totals: o.totals, tenantsNearLimit: o.tenantsNearLimit, tenantsWithoutRecentData: o.tenantsWithoutRecentData, generatedAt: o.generatedAt.toISOString() };
  },
  toHealth(h: TenantHealth): TenantHealthResponseDto {
    return { tenantId: h.tenantId, status: h.status, planCode: h.planCode, usage: usage(h.usage), studentsUsagePct: h.studentsUsagePct, kiosksUsagePct: h.kiosksUsagePct, nearLimit: h.nearLimit, stale: h.stale };
  },
};
