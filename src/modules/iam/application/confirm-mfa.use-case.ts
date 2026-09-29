import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { CLOCK, ClockPort } from '../../../shared/clock/clock.port';
import { APP_CONFIG, AppConfig } from '../../../shared/config/env';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { USER_REPOSITORY, UserRepositoryPort } from '../domain/ports/user.repository.port';
import { MfaVerifier } from './mfa-verifier.service';
import { SessionIssuer, TokenPair } from './session-issuer.service';

@Injectable()
export class ConfirmMfaUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly mfa: MfaVerifier,
    private readonly sessions: SessionIssuer,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  /** Activa MFA y entrega una sesión completa; el token de configuración deja de valer (token_version+1). */
  async execute(userId: string, code: string, meta: RequestMeta): Promise<TokenPair> {
    const now = this.clock.now();
    const user = await this.users.findById(userId);
    if (!user) throw new AppException(ErrorCodes.AUTH_TOKEN_INVALID);
    if (user.mfaEnabled) throw new AppException(ErrorCodes.AUTH_MFA_ALREADY_ENABLED);
    if (!user.mfaPendingSecretEnc) throw new AppException(ErrorCodes.AUTH_MFA_NOT_ENROLLED);

    const step = this.mfa.check(user.mfaPendingSecretEnc, code);
    if (step === null) {
      const policy = { maxAttempts: this.cfg.LOGIN_MAX_ATTEMPTS, baseLockMinutes: this.cfg.LOGIN_LOCK_MINUTES };
      await this.users.mutate(userId, (u) => u.registerFailedAttempt(now, policy));
      await this.audit.record({ action: 'auth.mfa.enroll_failed', outcome: 'failure', actorUserId: userId, meta });
      throw new AppException(ErrorCodes.AUTH_MFA_INVALID_CODE);
    }

    const updated = await this.users.mutate(userId, (u) => {
      if (u.mfaEnabled) throw new AppException(ErrorCodes.AUTH_MFA_ALREADY_ENABLED);
      u.confirmMfaEnrollment(step);
      u.registerSuccessfulLogin(now);
    });
    if (!updated) throw new AppException(ErrorCodes.AUTH_TOKEN_INVALID);

    const tokens = await this.sessions.open(updated, meta);
    await this.audit.record({ action: 'auth.mfa.enabled', outcome: 'success', actorUserId: userId, meta });
    return tokens;
  }
}
