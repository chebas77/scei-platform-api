import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { APP_CONFIG, AppConfig } from '../../../../shared/config/env';
import { AppException } from '../../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { AccessTokenVerifierPort, TokenScope, VerifiedAccessToken } from '../../../../shared/security/auth-context';
import { IssuedAccessToken, TokenIssuerPort } from '../../domain/ports/token-issuer.port';

interface AccessClaims {
  sub: string;
  sid: string;
  scp: TokenScope;
  tv: number;
  typ: 'access';
}
interface ChallengeClaims {
  sub: string;
  tv: number;
  typ: 'mfa_challenge';
}

/**
 * Emite y verifica JWT HS256. Reglas (OWASP A02/A07):
 *  - algoritmo fijo en la verificación (nunca `none`, nunca el que diga el header);
 *  - emisor y audiencia obligatorios; el desafío MFA usa otra audiencia, así no sirve como access token;
 *  - vida corta del access token; la sesión larga vive en el refresh token rotativo.
 */
@Injectable()
export class JwtTokenService implements TokenIssuerPort, AccessTokenVerifierPort {
  constructor(
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  async issueAccess(input: { userId: string; sessionId: string; scope: TokenScope; tokenVersion: number }): Promise<IssuedAccessToken> {
    const expiresInSeconds = input.scope === 'full' ? this.cfg.JWT_ACCESS_TTL_SECONDS : Math.min(this.cfg.JWT_ACCESS_TTL_SECONDS, 600);
    const claims: Omit<AccessClaims, 'sub'> = { sid: input.sessionId, scp: input.scope, tv: input.tokenVersion, typ: 'access' };
    const token = await this.jwt.signAsync(claims, {
      subject: input.userId,
      audience: this.cfg.JWT_AUDIENCE,
      expiresIn: expiresInSeconds,
    });
    return { token, expiresInSeconds };
  }

  async verify(token: string): Promise<VerifiedAccessToken> {
    const claims = await this.decode<AccessClaims>(token, this.cfg.JWT_AUDIENCE);
    if (claims.typ !== 'access' || !claims.sub || !claims.sid || (claims.scp !== 'full' && claims.scp !== 'mfa_setup') || typeof claims.tv !== 'number') {
      throw new AppException(ErrorCodes.AUTH_TOKEN_INVALID);
    }
    return { userId: claims.sub, sessionId: claims.sid, scope: claims.scp, tokenVersion: claims.tv };
  }

  issueMfaChallenge(input: { userId: string; tokenVersion: number }): Promise<string> {
    const claims: Omit<ChallengeClaims, 'sub'> = { tv: input.tokenVersion, typ: 'mfa_challenge' };
    return this.jwt.signAsync(claims, {
      subject: input.userId,
      audience: `${this.cfg.JWT_AUDIENCE}:mfa`,
      expiresIn: this.cfg.MFA_CHALLENGE_TTL_SECONDS,
    });
  }

  async verifyMfaChallenge(token: string): Promise<{ userId: string; tokenVersion: number }> {
    const claims = await this.decode<ChallengeClaims>(token, `${this.cfg.JWT_AUDIENCE}:mfa`);
    if (claims.typ !== 'mfa_challenge' || !claims.sub || typeof claims.tv !== 'number') {
      throw new AppException(ErrorCodes.AUTH_TOKEN_INVALID);
    }
    return { userId: claims.sub, tokenVersion: claims.tv };
  }

  private async decode<T extends object>(token: string, audience: string): Promise<T> {
    try {
      return await this.jwt.verifyAsync<T>(token, { algorithms: ['HS256'], issuer: this.cfg.JWT_ISSUER, audience });
    } catch (err) {
      if ((err as Error)?.name === 'TokenExpiredError') throw new AppException(ErrorCodes.AUTH_TOKEN_EXPIRED);
      throw new AppException(ErrorCodes.AUTH_TOKEN_INVALID);
    }
  }
}
