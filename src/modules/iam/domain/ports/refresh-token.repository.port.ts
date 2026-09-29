import { Tx } from '../../../../shared/database/tx';

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface NewRefreshToken {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  ip?: string;
  userAgent?: string;
}

export interface RefreshTokenRepositoryPort {
  create(input: NewRefreshToken, tx?: Tx): Promise<void>;
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  /** Revoca el token solo si seguía vigente. `false` = ya estaba revocado (posible reutilización). */
  markRotated(id: string, replacedBy: string, now: Date, tx?: Tx): Promise<boolean>;
  revokeFamily(familyId: string, now: Date): Promise<void>;
  revokeAllForUser(userId: string, now: Date): Promise<void>;
  hasActiveInFamily(familyId: string, now: Date): Promise<boolean>;
}
export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
