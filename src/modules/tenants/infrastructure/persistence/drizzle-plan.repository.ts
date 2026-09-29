import { Inject, Injectable } from '@nestjs/common';
import { asc, count, eq, inArray, ne, sql } from 'drizzle-orm';
import { Db, DB } from '../../../../shared/database/tx';
import { pgError, PG_UNIQUE_VIOLATION } from '../../../../shared/database/pg-errors';
import { NewPlan, Plan } from '../../domain/plan';
import { PlanRepositoryPort } from '../../domain/ports/plan.repository.port';
import { plans } from './schema/plans.table';
import { tenants } from './schema/tenants.table';

@Injectable()
export class DrizzlePlanRepository implements PlanRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(input: NewPlan): Promise<Plan | null> {
    try {
      const [row] = await this.db.insert(plans).values(input).returning();
      return row;
    } catch (err) {
      if (pgError(err)?.code === PG_UNIQUE_VIOLATION) return null;
      throw err;
    }
  }

  async findById(id: string): Promise<Plan | null> {
    const [row] = await this.db.select().from(plans).where(eq(plans.id, id)).limit(1);
    return row ?? null;
  }

  findByIds(ids: string[]): Promise<Plan[]> {
    return ids.length ? this.db.select().from(plans).where(inArray(plans.id, ids)) : Promise.resolve([]);
  }

  list(): Promise<Plan[]> {
    return this.db.select().from(plans).orderBy(asc(plans.maxStudents), asc(plans.code));
  }

  async update(id: string, patch: Parameters<PlanRepositoryPort['update']>[1]): Promise<Plan | null> {
    const [row] = await this.db.update(plans).set({ ...patch, updatedAt: sql`now()` }).where(eq(plans.id, id)).returning();
    return row ?? null;
  }

  async tenantCountsByPlan(): Promise<Record<string, number>> {
    const rows = await this.db.select({ planId: tenants.planId, n: count() }).from(tenants).where(ne(tenants.status, 'purged')).groupBy(tenants.planId);
    return Object.fromEntries(rows.map((r) => [r.planId, Number(r.n)]));
  }
}
