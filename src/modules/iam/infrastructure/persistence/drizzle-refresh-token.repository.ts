import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { Db, DB, Tx, executor as pick } from '../../../../shared/database/tx';
import {
  NewRefreshToken,
  RefreshTokenRecord,
  RefreshTokenRepositoryPort,
} from '../../domain/ports/refresh-token.repository.port';
import { refreshTokens } from './schema/refresh-tokens.table';

@Injectable()
export class DrizzleRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(input: NewRefreshToken, tx?: Tx): Promise<void> {
    await pick(this.db, tx)
      .insert(refreshTokens)
      .values({
        id: input.id,
        userId: input.userId,
        familyId: input.familyId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        ip: input.ip,
        userAgent: input.userAgent,
      });
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const [row] = await this.db
      .select({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
        familyId: refreshTokens.familyId,
        tokenHash: refreshTokens.tokenHash,
        expiresAt: refreshTokens.expiresAt,
        revokedAt: refreshTokens.revokedAt,
      })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);
    return row ?? null;
  }

  async markRotated(id: string, replacedBy: string, now: Date, tx?: Tx): Promise<boolean> {
    const rows = await pick(this.db, tx)
      .update(refreshTokens)
      .set({ revokedAt: now, replacedBy })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)))
      .returning({ id: refreshTokens.id });
    return rows.length === 1;
  }

  async revokeFamily(familyId: string, now: Date): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
  }

  async revokeAllForUser(userId: string, now: Date): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  async hasActiveInFamily(familyId: string, now: Date): Promise<boolean> {
    const rows = await this.db
      .select({ id: refreshTokens.id })
      .from(refreshTokens)
      .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt), gt(refreshTokens.expiresAt, now)))
      .limit(1);
    return rows.length > 0;
  }
}
