import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { CLOCK, ClockPort } from '../../../shared/clock/clock.port';
import { APP_CONFIG, AppConfig } from '../../../shared/config/env';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { TOKEN_ISSUER, TokenIssuerPort } from '../domain/ports/token-issuer.port';
import { USER_REPOSITORY, UserRepositoryPort } from '../domain/ports/user.repository.port';
import { MfaVerifier } from './mfa-verifier.service';
import { SessionIssuer, TokenPair } from './session-issuer.service';

@Injectable()
export class VerifyMfaUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(TOKEN_ISSUER) private readonly issuer: TokenIssuerPort,
    private readonly mfa: MfaVerifier,
    private readonly sessions: SessionIssuer,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  async execute(input: { challengeToken: string; code: string }, meta: RequestMeta): Promise<TokenPair> {
    const challenge = await this.issuer.verifyMfaChallenge(input.challengeToken);
    const now = this.clock.now();
    const policy = { maxAttempts: this.cfg.LOGIN_MAX_ATTEMPTS, baseLockMinutes: this.cfg.LOGIN_LOCK_MINUTES };

    const user = await this.users.findById(challenge.userId);
    if (!user || !user.isActive || user.tokenVersion !== challenge.tokenVersion || !user.mfaSecretEnc) {
      throw new AppException(ErrorCodes.AUTH_TOKEN_INVALID);
    }
    if (user.isLocked(now)) throw new AppException(ErrorCodes.AUTH_ACCOUNT_LOCKED);

    const step = this.mfa.check(user.mfaSecretEnc, input.code);
    let accepted = false;
    // El intervalo se acepta dentro de la transacción con bloqueo de fila: un mismo código no sirve dos veces.
    const updated = await this.users.mutate(user.id, (u) => {
      if (step !== null && u.acceptMfaStep(step)) {
        accepted = true;
        u.registerSuccessfulLogin(now);
      } else {
        u.registerFailedAttempt(now, policy);
      }
    });

    if (!accepted || !updated) {
      await this.audit.record({ action: 'auth.mfa.failed', outcome: 'failure', actorUserId: user.id, meta, metadata: { replay: step !== null } });
      throw new AppException(updated?.isLocked(now) ? ErrorCodes.AUTH_ACCOUNT_LOCKED : ErrorCodes.AUTH_MFA_INVALID_CODE);
    }

    const tokens = await this.sessions.open(updated, meta);
    await this.audit.record({ action: 'auth.login.success', outcome: 'success', actorUserId: user.id, meta, metadata: { mfa: true } });
    return tokens;
  }
}
