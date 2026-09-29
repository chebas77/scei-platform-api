import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { CLOCK, ClockPort } from '../../../shared/clock/clock.port';
import { sha256Hex } from '../../../shared/crypto/crypto.ports';
import { TRANSACTION_RUNNER, TransactionRunnerPort } from '../../../shared/database/tx';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { REFRESH_TOKEN_REPOSITORY, RefreshTokenRecord, RefreshTokenRepositoryPort } from '../domain/ports/refresh-token.repository.port';
import { USER_REPOSITORY, UserRepositoryPort } from '../domain/ports/user.repository.port';
import { SessionIssuer, TokenPair } from './session-issuer.service';

class RotationRace extends Error {}

/**
 * Rotación con detección de reutilización: cada refresh token sirve una sola vez.
 * Si llega uno ya usado, se asume robo y se revoca toda la sesión (familia).
 */
@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly tokens: RefreshTokenRepositoryPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(TRANSACTION_RUNNER) private readonly tx: TransactionRunnerPort,
    private readonly sessions: SessionIssuer,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(refreshToken: string, meta: RequestMeta): Promise<TokenPair> {
    const now = this.clock.now();
    const record = await this.tokens.findByHash(sha256Hex(refreshToken));
    if (!record) throw new AppException(ErrorCodes.AUTH_TOKEN_INVALID);
    if (record.revokedAt) return this.reuseDetected(record, meta);
    if (record.expiresAt <= now) throw new AppException(ErrorCodes.AUTH_TOKEN_EXPIRED);

    const user = await this.users.findById(record.userId);
    if (!user || !user.isActive) throw new AppException(ErrorCodes.AUTH_ACCOUNT_DISABLED);

    const newId = randomUUID();
    try {
      const pair = await this.tx.run(async (t) => {
        if (!(await this.tokens.markRotated(record.id, newId, now, t))) throw new RotationRace();
        return this.sessions.issueInFamily(user, record.familyId, meta, t, newId);
      });
      await this.audit.record({ action: 'auth.token.refreshed', outcome: 'success', actorUserId: user.id, meta });
      return pair;
    } catch (err) {
      if (err instanceof RotationRace) return this.reuseDetected(record, meta);
      throw err;
    }
  }

  private async reuseDetected(record: RefreshTokenRecord, meta: RequestMeta): Promise<never> {
    await this.tokens.revokeFamily(record.familyId, this.clock.now());
    await this.audit.record({ action: 'auth.refresh.reuse_detected', outcome: 'denied', actorUserId: record.userId, meta, metadata: { familyId: record.familyId } });
    throw new AppException(ErrorCodes.AUTH_REFRESH_REUSED);
  }
}
