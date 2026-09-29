import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { Db, DB, Tx, executor as pick } from '../../../../shared/database/tx';
import { NewUser, UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { User, UserProps, UserStatus } from '../../domain/user';
import { users } from './schema/users.table';

type Row = typeof users.$inferSelect;

const toProps = (r: Row): UserProps => ({
  id: r.id,
  email: r.email,
  passwordHash: r.passwordHash,
  status: r.status as UserStatus,
  failedLoginAttempts: r.failedLoginAttempts,
  lockoutCount: r.lockoutCount,
  lockedUntil: r.lockedUntil,
  mfaEnabled: r.mfaEnabled,
  mfaSecretEnc: r.mfaSecretEnc,
  mfaPendingSecretEnc: r.mfaPendingSecretEnc,
  mfaLastStep: r.mfaLastStep,
  tokenVersion: r.tokenVersion,
  lastLoginAt: r.lastLoginAt,
  createdAt: r.createdAt,
});

@Injectable()
export class DrizzleUserRepository implements UserRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? User.rehydrate(toProps(row)) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ? User.rehydrate(toProps(row)) : null;
  }

  async listByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.select().from(users).where(inArray(users.id, ids));
    return rows.map((r) => User.rehydrate(toProps(r)));
  }

  async getAuthState(id: string): Promise<{ status: UserStatus; tokenVersion: number } | null> {
    const [row] = await this.db.select({ status: users.status, tokenVersion: users.tokenVersion }).from(users).where(eq(users.id, id)).limit(1);
    return row ? { status: row.status as UserStatus, tokenVersion: row.tokenVersion } : null;
  }

  async create(input: NewUser, tx?: Tx): Promise<User | null> {
    const [row] = await pick(this.db, tx)
      .insert(users)
      .values({ email: input.email, passwordHash: input.passwordHash })
      .onConflictDoNothing({ target: users.email })
      .returning();
    return row ? User.rehydrate(toProps(row)) : null;
  }

  async mutate(id: string, mutate: (user: User) => void | Promise<void>): Promise<User | null> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.select().from(users).where(eq(users.id, id)).for('update').limit(1);
      if (!row) return null;
      const user = User.rehydrate(toProps(row));
      await mutate(user);
      const p = user.toProps();
      await tx
        .update(users)
        .set({
          status: p.status,
          failedLoginAttempts: p.failedLoginAttempts,
          lockoutCount: p.lockoutCount,
          lockedUntil: p.lockedUntil,
          mfaEnabled: p.mfaEnabled,
          mfaSecretEnc: p.mfaSecretEnc,
          mfaPendingSecretEnc: p.mfaPendingSecretEnc,
          mfaLastStep: p.mfaLastStep,
          tokenVersion: p.tokenVersion,
          lastLoginAt: p.lastLoginAt,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));
      return user;
    });
  }
}
