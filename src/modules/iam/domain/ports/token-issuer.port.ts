import { TokenScope } from '../../../../shared/security/auth-context';

export interface IssuedAccessToken {
  token: string;
  expiresInSeconds: number;
}

export interface TokenIssuerPort {
  issueAccess(input: { userId: string; sessionId: string; scope: TokenScope; tokenVersion: number }): Promise<IssuedAccessToken>;
  /** Token de un solo propósito y vida corta que prueba que la contraseña ya fue validada. */
  issueMfaChallenge(input: { userId: string; tokenVersion: number }): Promise<string>;
  verifyMfaChallenge(token: string): Promise<{ userId: string; tokenVersion: number }>;
}
export const TOKEN_ISSUER = Symbol('TOKEN_ISSUER');
