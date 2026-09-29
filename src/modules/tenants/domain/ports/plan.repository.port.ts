import { Tx } from '../../../../shared/database/tx';
import { NewPlan, Plan, UsageSnapshot } from '../plan';

export interface PlanRepositoryPort {
  /** `null` si el código ya existe. */
  create(input: NewPlan): Promise<Plan | null>;
  findById(id: string): Promise<Plan | null>;
  findByIds(ids: string[]): Promise<Plan[]>;
  list(): Promise<Plan[]>;
  update(id: string, patch: Partial<Pick<Plan, 'name' | 'maxStudents' | 'maxKiosks' | 'retentionDays' | 'isActive'>>): Promise<Plan | null>;
  /** Cuántos colegios (no dados de baja) usan cada plan. */
  tenantCountsByPlan(): Promise<Record<string, number>>;
}
export const PLAN_REPOSITORY = Symbol('PLAN_REPOSITORY');

export interface UsageRepositoryPort {
  latestFor(tenantId: string): Promise<UsageSnapshot | null>;
  latestForMany(tenantIds: string[]): Promise<Map<string, UsageSnapshot>>;
  /** Último snapshot de cada colegio activo o suspendido (para el panel agregado). */
  latestOfEveryLiveTenant(): Promise<{ tenantId: string; planId: string; snapshot: UsageSnapshot }[]>;
  deleteForTenant(tenantId: string, tx?: Tx): Promise<number>;
}
export const USAGE_REPOSITORY = Symbol('USAGE_REPOSITORY');
