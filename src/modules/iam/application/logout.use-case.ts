import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { CLOCK, ClockPort } from '../../../shared/clock/clock.port';
import { AuthContext } from '../../../shared/security/auth-context';
import { REFRESH_TOKEN_REPOSITORY, RefreshTokenRepositoryPort } from '../domain/ports/refresh-token.repository.port';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly tokens: RefreshTokenRepositoryPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(auth: AuthContext, meta: RequestMeta): Promise<void> {
    await this.tokens.revokeFamily(auth.sessionId, this.clock.now());
    await this.audit.record({ action: 'auth.logout', outcome: 'success', actorUserId: auth.userId, meta });
  }
}
