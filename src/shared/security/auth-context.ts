export type TokenScope = 'full' | 'mfa_setup';

/** Identidad autenticada de la solicitud, resuelta por `JwtAuthGuard`. */
export interface AuthContext {
  userId: string;
  sessionId: string;
  scope: TokenScope;
}

export interface VerifiedAccessToken extends AuthContext {
  tokenVersion: number;
}

/** Implementado por IAM: valida firma, emisor, audiencia y expiración. */
export interface AccessTokenVerifierPort {
  verify(token: string): Promise<VerifiedAccessToken>;
}
export const ACCESS_TOKEN_VERIFIER = Symbol('ACCESS_TOKEN_VERIFIER');

/** Implementado por IAM: comprueba que la sesión/usuario sigan vigentes (revocación inmediata). */
export interface SessionValidatorPort {
  isActive(token: VerifiedAccessToken): Promise<boolean>;
}
export const SESSION_VALIDATOR = Symbol('SESSION_VALIDATOR');

/** Implementado por RBAC: permisos efectivos del usuario (módulos + permisos sueltos de sus roles). */
export interface PermissionResolverPort {
  /** `tenantId = null` resuelve permisos del ámbito de plataforma. */
  resolve(userId: string, tenantId: string | null): Promise<ReadonlySet<string>>;
}
export const PERMISSION_RESOLVER = Symbol('PERMISSION_RESOLVER');

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}
