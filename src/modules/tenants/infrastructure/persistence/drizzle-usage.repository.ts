import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { Db, DB, Tx, executor as pick } from '../../../../shared/database/tx';
import { UsageSnapshot } from '../../domain/plan';
import { UsageRepositoryPort } from '../../domain/ports/plan.repository.port';
import { tenantUsageSnapshots as t } from './schema/tenant-usage-snapshots.table';
import { tenants } from './schema/tenants.table';

const toSnapshot = (r: typeof t.$inferSelect): UsageSnapshot => ({
  capturedAt: r.capturedAt, studentsCount: r.studentsCount, kiosksCount: r.kiosksCount,
  apiP95Ms: r.apiP95Ms, queueDepth: r.queueDepth, errorRate: r.errorRate,
});

@Injectable()
export class DrizzleUsageRepository implements UsageRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async latestFor(tenantId: string): Promise<UsageSnapshot | null> {
    const [row] = await this.db.select().from(t).where(eq(t.tenantId, tenantId)).orderBy(desc(t.capturedAt)).limit(1);
    return row ? toSnapshot(row) : null;
  }

  async latestForMany(tenantIds: string[]): Promise<Map<string, UsageSnapshot>> {
    if (!tenantIds.length) return new Map();
    const rows = await this.db
      .selectDistinctOn([t.tenantId])
      .from(t)
      .where(inArray(t.tenantId, tenantIds))
      .orderBy(t.tenantId, desc(t.capturedAt));
    return new Map(rows.map((r) => [r.tenantId, toSnapshot(r)]));
  }

  async latestOfEveryLiveTenant(): Promise<{ tenantId: string; planId: string; snapshot: UsageSnapshot }[]> {
    const rows = await this.db
      .selectDistinctOn([t.tenantId], { snap: t, planId: tenants.planId })
      .from(t)
      .innerJoin(tenants, eq(tenants.id, t.tenantId))
      .where(sql`${tenants.status} in ('active','suspended')`)
      .orderBy(t.tenantId, desc(t.capturedAt));
    return rows.map((r) => ({ tenantId: r.snap.tenantId, planId: r.planId, snapshot: toSnapshot(r.snap) }));
  }

  async deleteForTenant(tenantId: string, tx?: Tx): Promise<number> {
    const rows = await pick(this.db, tx).delete(t).where(eq(t.tenantId, tenantId)).returning({ id: t.id });
    return rows.length;
  }
}
