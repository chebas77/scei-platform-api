import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { CLOCK, ClockPort } from '../../../shared/clock/clock.port';
import { APP_CONFIG, AppConfig } from '../../../shared/config/env';
import { PASSWORD_HASHER, PasswordHasherPort, randomToken, sha256Hex } from '../../../shared/crypto/crypto.ports';
import { MFA_POLICY, MfaPolicyPort } from '../../../shared/contracts/rbac.contracts';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { TOKEN_ISSUER, TokenIssuerPort } from '../domain/ports/token-issuer.port';
import { USER_REPOSITORY, UserRepositoryPort } from '../domain/ports/user.repository.port';
import { normalizeEmail } from '../domain/user';
import { SessionIssuer, TokenPair } from './session-issuer.service';

export type LoginResult =
  | { status: 'authenticated'; tokens: TokenPair }
  | { status: 'mfa_required'; challengeToken: string }
  | { status: 'mfa_setup_required'; setupToken: { accessToken: string; expiresIn: number } };

@Injectable()
export class LoginUseCase {
  private dummyHash?: Promise<string>;

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(MFA_POLICY) private readonly mfaPolicy: MfaPolicyPort,
    @Inject(TOKEN_ISSUER) private readonly issuer: TokenIssuerPort,
    private readonly sessions: SessionIssuer,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  async execute(input: { email: string; password: string }, meta: RequestMeta): Promise<LoginResult> {
    const email = normalizeEmail(input.email);
    const now = this.clock.now();
    const policy = { maxAttempts: this.cfg.LOGIN_MAX_ATTEMPTS, baseLockMinutes: this.cfg.LOGIN_LOCK_MINUTES };

    const user = await this.users.findByEmail(email);
    if (!user || !user.passwordHash) {
      // Se gasta el mismo tiempo que con un usuario real: no se puede deducir qué correos existen.
      await this.hasher.verify(await this.getDummyHash(), input.password);
      await this.audit.record({
        action: 'auth.login.failed',
        outcome: 'failure',
        meta,
        metadata: { reason: 'unknown_account', emailFingerprint: sha256Hex(email).slice(0, 16) },
      });
      throw new AppException(ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    if (user.isLocked(now)) {
      await this.audit.record({ action: 'auth.login.blocked', outcome: 'denied', actorUserId: user.id, meta, metadata: { lockedUntil: user.lockedUntil?.toISOString() } });
      throw new AppException(ErrorCodes.AUTH_ACCOUNT_LOCKED);
    }

    if (!(await this.hasher.verify(user.passwordHash, input.password))) {
      const updated = await this.users.mutate(user.id, (u) => u.registerFailedAttempt(now, policy));
      const locked = updated?.isLocked(now) ?? false;
      await this.audit.record({ action: 'auth.login.failed', outcome: 'failure', actorUserId: user.id, meta, metadata: { reason: 'bad_password', lockedNow: locked } });
      throw new AppException(locked ? ErrorCodes.AUTH_ACCOUNT_LOCKED : ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      await this.audit.record({ action: 'auth.login.blocked', outcome: 'denied', actorUserId: user.id, meta, metadata: { reason: 'disabled' } });
      throw new AppException(ErrorCodes.AUTH_ACCOUNT_DISABLED);
    }

    // Con la contraseña correcta todavía NO se reinician los contadores: eso solo ocurre con el login completo.
    if (user.mfaEnabled) {
      const challengeToken = await this.issuer.issueMfaChallenge({ userId: user.id, tokenVersion: user.tokenVersion });
      await this.audit.record({ action: 'auth.login.mfa_challenge', outcome: 'success', actorUserId: user.id, meta });
      return { status: 'mfa_required', challengeToken };
    }

    if (await this.mfaPolicy.isMfaRequired(user.id)) {
      const setup = await this.issuer.issueAccess({ userId: user.id, sessionId: randomUUID(), scope: 'mfa_setup', tokenVersion: user.tokenVersion });
      await this.audit.record({ action: 'auth.login.mfa_setup_required', outcome: 'success', actorUserId: user.id, meta });
      return { status: 'mfa_setup_required', setupToken: { accessToken: setup.token, expiresIn: setup.expiresInSeconds } };
    }

    await this.users.mutate(user.id, (u) => u.registerSuccessfulLogin(now));
    const tokens = await this.sessions.open(user, meta);
    await this.audit.record({ action: 'auth.login.success', outcome: 'success', actorUserId: user.id, meta, metadata: { mfa: false } });
    return { status: 'authenticated', tokens };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash(randomToken(16));
    return this.dummyHash;
  }
}
