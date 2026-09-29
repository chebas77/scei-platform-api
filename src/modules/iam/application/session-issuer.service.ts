import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { CLOCK, ClockPort } from '../../../shared/clock/clock.port';
import { APP_CONFIG, AppConfig } from '../../../shared/config/env';
import { randomToken, sha256Hex } from '../../../shared/crypto/crypto.ports';
import { Tx } from '../../../shared/database/tx';
import { REFRESH_TOKEN_REPOSITORY, RefreshTokenRepositoryPort } from '../domain/ports/refresh-token.repository.port';
import { TOKEN_ISSUER, TokenIssuerPort } from '../domain/ports/token-issuer.port';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Segundos de vida del access token. */
  expiresIn: number;
  tokenType: 'Bearer';
}

/** Abre sesiones: un access token corto + un refresh token opaco (solo su hash queda en BD). */
@Injectable()
export class SessionIssuer {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepositoryPort,
    @Inject(TOKEN_ISSUER) private readonly issuer: TokenIssuerPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  /** Nueva sesión (nueva familia de refresh tokens). */
  open(user: { id: string; tokenVersion: number }, meta: RequestMeta): Promise<TokenPair> {
    return this.issueInFamily(user, randomUUID(), meta);
  }

  /** Emite un par dentro de una sesión existente (rotación). */
  async issueInFamily(
    user: { id: string; tokenVersion: number },
    familyId: string,
    meta: RequestMeta,
    tx?: Tx,
    tokenId: string = randomUUID(),
  ): Promise<TokenPair> {
    const refreshToken = randomToken(48);
    const now = this.clock.now();
    await this.refreshTokens.create(
      {
        id: tokenId,
        userId: user.id,
        familyId,
        tokenHash: sha256Hex(refreshToken),
        expiresAt: new Date(now.getTime() + this.cfg.JWT_REFRESH_TTL_DAYS * 86_400_000),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
      tx,
    );
    const access = await this.issuer.issueAccess({ userId: user.id, sessionId: familyId, scope: 'full', tokenVersion: user.tokenVersion });
    return { accessToken: access.token, refreshToken, expiresIn: access.expiresInSeconds, tokenType: 'Bearer' };
  }
}
