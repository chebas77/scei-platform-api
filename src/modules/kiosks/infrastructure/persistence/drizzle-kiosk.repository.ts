import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import { Db, DB, Tx, executor as pick } from '../../../../shared/database/tx';
import { Kiosk, NewKiosk } from '../../domain/kiosk';
import { KioskRepositoryPort } from '../../domain/ports/kiosk.repository.port';
import { kiosks } from './schema/kiosks.table';

const toDomain = (r: typeof kiosks.$inferSelect): Kiosk => ({
  id: r.id, tenantId: r.tenantId, code: r.code, name: r.name, status: r.status as Kiosk['status'], createdAt: r.createdAt, updatedAt: r.updatedAt,
});

@Injectable()
export class DrizzleKioskRepository implements KioskRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(input: NewKiosk, tx?: Tx): Promise<Kiosk | null> {
    const [row] = await pick(this.db, tx)
      .insert(kiosks)
      .values({ tenantId: input.tenantId, code: input.code, name: input.name })
      .onConflictDoNothing({ target: [kiosks.tenantId, kiosks.code] })
      .returning();
    return row ? toDomain(row) : null;
  }

  async findById(id: string): Promise<Kiosk | null> {
    const [row] = await this.db.select().from(kiosks).where(eq(kiosks.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async listByTenant(tenantId: string): Promise<Kiosk[]> {
    return (await this.db.select().from(kiosks).where(eq(kiosks.tenantId, tenantId))).map(toDomain);
  }

  async countActiveByTenant(tenantId: string): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(kiosks).where(and(eq(kiosks.tenantId, tenantId), eq(kiosks.status, 'active')));
    return row?.n ?? 0;
  }

  async update(id: string, patch: Partial<Pick<Kiosk, 'name' | 'status'>>): Promise<Kiosk | null> {
    const [row] = await this.db.update(kiosks).set({ ...patch, updatedAt: new Date() }).where(eq(kiosks.id, id)).returning();
    return row ? toDomain(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db.delete(kiosks).where(eq(kiosks.id, id)).returning({ id: kiosks.id });
    return rows.length > 0;
  }

  async deleteAllForTenant(tenantId: string, tx: Tx): Promise<number> {
    const rows = await pick(this.db, tx).delete(kiosks).where(eq(kiosks.tenantId, tenantId)).returning({ id: kiosks.id });
    return rows.length;
  }
}
