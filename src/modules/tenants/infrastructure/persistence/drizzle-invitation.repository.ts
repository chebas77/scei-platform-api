import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { Db, DB, Tx, executor as pick } from '../../../../shared/database/tx';
import { InvitationRepositoryPort, TenantInvitation } from '../../domain/ports/invitation.repository.port';
import { tenantInvitations as inv } from './schema/tenant-invitations.table';

const toDomain = (r: typeof inv.$inferSelect): TenantInvitation => ({
  id: r.id, tenantId: r.tenantId, email: r.email, roleId: r.roleId,
  expiresAt: r.expiresAt, acceptedAt: r.acceptedAt, revokedAt: r.revokedAt, createdAt: r.createdAt,
});

@Injectable()
export class DrizzleInvitationRepository implements InvitationRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(input: Parameters<InvitationRepositoryPort['create']>[0], tx?: Tx): Promise<TenantInvitation> {
    const [row] = await pick(this.db, tx).insert(inv).values(input).returning();
    return toDomain(row);
  }

  async consume(tokenHash: string, now: Date, tx: Tx): Promise<TenantInvitation | null> {
    // UPDATE condicional: dos aceptaciones simultáneas no pueden ganar las dos (un solo uso).
    const [row] = await pick(this.db, tx)
      .update(inv)
      .set({ acceptedAt: now })
      .where(and(eq(inv.tokenHash, tokenHash), isNull(inv.acceptedAt), isNull(inv.revokedAt), gt(inv.expiresAt, now)))
      .returning();
    return row ? toDomain(row) : null;
  }

  async revokePending(tenantId: string, now: Date, tx?: Tx): Promise<number> {
    const rows = await pick(this.db, tx)
      .update(inv)
      .set({ revokedAt: now })
      .where(and(eq(inv.tenantId, tenantId), isNull(inv.acceptedAt), isNull(inv.revokedAt)))
      .returning({ id: inv.id });
    return rows.length;
  }

  async listByTenant(tenantId: string): Promise<TenantInvitation[]> {
    return (await this.db.select().from(inv).where(eq(inv.tenantId, tenantId)).orderBy(desc(inv.createdAt))).map(toDomain);
  }
}
