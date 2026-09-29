import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { Db, DB, Tx, executor as pick } from '../../../../shared/database/tx';
import { pgError, PG_UNIQUE_VIOLATION } from '../../../../shared/database/pg-errors';
import { Page } from '../../../../shared/http/pagination';
import { Tenant, TenantStatus } from '../../domain/tenant';
import { CreateTenantResult, NewTenant, TenantRepositoryPort } from '../../domain/ports/tenant.repository.port';
import { tenants } from './schema/tenants.table';

const toDomain = (r: typeof tenants.$inferSelect): Tenant => ({ ...r, status: r.status as TenantStatus });
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

@Injectable()
export class DrizzleTenantRepository implements TenantRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(input: NewTenant, tx?: Tx): Promise<CreateTenantResult> {
    try {
      const [row] = await pick(this.db, tx).insert(tenants).values(input).returning();
      return { ok: true, tenant: toDomain(row) };
    } catch (err) {
      const e = pgError(err);
      if (e?.code === PG_UNIQUE_VIOLATION) return { ok: false, conflict: e.constraint?.includes('ruc') ? 'ruc' : 'slug' };
      throw err;
    }
  }

  async findById(id: string): Promise<Tenant | null> {
    const [row] = await this.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const [row] = await this.db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findByIdForUpdate(id: string, tx: Tx): Promise<Tenant | null> {
    const [row] = await pick(this.db, tx).select().from(tenants).where(eq(tenants.id, id)).limit(1).for('update');
    return row ? toDomain(row) : null;
  }

  async list(filter: { status?: TenantStatus; search?: string; page: number; pageSize: number }): Promise<Page<Tenant>> {
    const term = filter.search?.trim();
    const where = and(
      filter.status ? eq(tenants.status, filter.status) : undefined,
      term ? or(ilike(tenants.slug, `%${escapeLike(term)}%`), ilike(tenants.legalName, `%${escapeLike(term)}%`)) : undefined,
    );
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(tenants).where(where).orderBy(desc(tenants.createdAt)).limit(filter.pageSize).offset((filter.page - 1) * filter.pageSize),
      this.db.select({ total: count() }).from(tenants).where(where),
    ]);
    return { items: rows.map(toDomain), page: filter.page, pageSize: filter.pageSize, total: Number(total) };
  }

  async liveIdsByPlan(planId: string): Promise<string[]> {
    const rows = await this.db.select({ id: tenants.id }).from(tenants).where(and(eq(tenants.planId, planId), inArray(tenants.status, ['active', 'suspended'])));
    return rows.map((r) => r.id);
  }

  async countByStatus(): Promise<Record<TenantStatus, number>> {
    const rows = await this.db.select({ status: tenants.status, n: count() }).from(tenants).groupBy(tenants.status);
    const out: Record<TenantStatus, number> = { active: 0, suspended: 0, pending_deletion: 0, purged: 0 };
    for (const r of rows) out[r.status as TenantStatus] = Number(r.n);
    return out;
  }

  async update(id: string, patch: Parameters<TenantRepositoryPort['update']>[1], tx?: Tx): Promise<Tenant> {
    const [row] = await pick(this.db, tx).update(tenants).set({ ...patch, updatedAt: sql`now()` }).where(eq(tenants.id, id)).returning();
    return toDomain(row);
  }
}
