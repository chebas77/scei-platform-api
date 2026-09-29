import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '../../../../shared/clock/clock.port';
import { SessionValidatorPort, VerifiedAccessToken } from '../../../../shared/security/auth-context';
import { REFRESH_TOKEN_REPOSITORY, RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token.repository.port';
import { USER_REPOSITORY, UserRepositoryPort } from '../../domain/ports/user.repository.port';

/**
 * Revocación inmediata: aunque el JWT siga sin vencer, la solicitud falla si el usuario se
 * deshabilitó, cambió su `token_version` o cerró/perdió la sesión (familia de refresh revocada).
 */
@Injectable()
export class DbSessionValidator implements SessionValidatorPort {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async isActive(token: VerifiedAccessToken): Promise<boolean> {
    const state = await this.users.getAuthState(token.userId);
    if (!state || state.status !== 'active' || state.tokenVersion !== token.tokenVersion) return false;
    // El token de configuración de MFA no tiene refresh token asociado.
    if (token.scope === 'mfa_setup') return true;
    return this.refreshTokens.hasActiveInFamily(token.sessionId, this.clock.now());
  }
}
