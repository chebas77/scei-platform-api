import { Tx } from '../../../../shared/database/tx';
import { Page } from '../../../../shared/http/pagination';
import { Tenant, TenantStatus } from '../tenant';

export interface NewTenant {
  slug: string;
  legalName: string;
  ruc: string | null;
  planId: string;
  createdBy: string;
}

export type CreateTenantResult = { ok: true; tenant: Tenant } | { ok: false; conflict: 'slug' | 'ruc' };

export interface TenantRepositoryPort {
  create(input: NewTenant, tx?: Tx): Promise<CreateTenantResult>;
  findById(id: string): Promise<Tenant | null>;
  /** Bloquea la fila (`FOR UPDATE`) dentro de la transacción para serializar cambios de estado. */
  findByIdForUpdate(id: string, tx: Tx): Promise<Tenant | null>;
  list(filter: { status?: TenantStatus; search?: string; page: number; pageSize: number }): Promise<Page<Tenant>>;
  /** Colegios vigentes (activos o suspendidos) que usan un plan. */
  liveIdsByPlan(planId: string): Promise<string[]>;
  countByStatus(): Promise<Record<TenantStatus, number>>;
  update(id: string, patch: Partial<Pick<Tenant, 'status' | 'planId' | 'suspendedAt' | 'suspensionReason' | 'deletionRequestedAt' | 'deletionRequestedBy' | 'purgedAt'>>, tx?: Tx): Promise<Tenant>;
}
export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');
