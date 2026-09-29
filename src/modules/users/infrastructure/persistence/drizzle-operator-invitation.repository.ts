import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { Db, DB, Tx, executor as pick } from '../../../../shared/database/tx';
import { OperatorInvitation, OperatorInvitationRepositoryPort } from '../../domain/ports/operator-invitation.repository.port';
import { operatorInvitations as inv } from './schema/operator-invitations.table';

const toDomain = (r: typeof inv.$inferSelect): OperatorInvitation => ({
  id: r.id, tenantId: r.tenantId, email: r.email, roleId: r.roleId,
  expiresAt: r.expiresAt, acceptedAt: r.acceptedAt, revokedAt: r.revokedAt, createdAt: r.createdAt,
});

@Injectable()
export class DrizzleOperatorInvitationRepository implements OperatorInvitationRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(input: Parameters<OperatorInvitationRepositoryPort['create']>[0], tx?: Tx): Promise<OperatorInvitation> {
    const [row] = await pick(this.db, tx).insert(inv).values(input).returning();
    return toDomain(row);
  }

  async consume(tokenHash: string, now: Date, tx: Tx): Promise<OperatorInvitation | null> {
    const [row] = await pick(this.db, tx)
      .update(inv)
      .set({ acceptedAt: now })
      .where(and(eq(inv.tokenHash, tokenHash), isNull(inv.acceptedAt), isNull(inv.revokedAt), gt(inv.expiresAt, now)))
      .returning();
    return row ? toDomain(row) : null;
  }

  async hasPending(email: string, tenantId: string | null, now: Date): Promise<boolean> {
    const scopeWhere = tenantId === null ? isNull(inv.tenantId) : eq(inv.tenantId, tenantId);
    const rows = await this.db
      .select({ id: inv.id })
      .from(inv)
      .where(and(eq(inv.email, email), scopeWhere, isNull(inv.acceptedAt), isNull(inv.revokedAt), gt(inv.expiresAt, now)))
      .limit(1);
    return rows.length > 0;
  }
}
