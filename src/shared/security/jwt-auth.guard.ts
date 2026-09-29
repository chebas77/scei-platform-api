import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { AppException } from '../errors/app.exception';
import { ErrorCodes } from '../errors/error-codes';
import {
  ACCESS_TOKEN_VERIFIER,
  AccessTokenVerifierPort,
  SESSION_VALIDATOR,
  SessionValidatorPort,
} from './auth-context';
import { AUTH_ONLY_KEY, IS_PUBLIC_KEY } from './decorators';

/**
 * Guard global #1: autenticación. Toda ruta exige un access token válido salvo `@Public()`.
 * Un token con scope `mfa_setup` solo sirve en rutas `@AuthenticatedOnly({ allowSetupScope: true })`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ACCESS_TOKEN_VERIFIER) private readonly verifier: AccessTokenVerifierPort,
    @Inject(SESSION_VALIDATOR) private readonly sessions: SessionValidatorPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) throw new AppException(ErrorCodes.AUTH_TOKEN_INVALID);

    const token = await this.verifier.verify(header.slice(7).trim());
    if (!(await this.sessions.isActive(token))) throw new AppException(ErrorCodes.AUTH_TOKEN_INVALID);

    if (token.scope === 'mfa_setup') {
      const authOnly = this.reflector.getAllAndOverride<{ allowSetupScope: boolean } | undefined>(AUTH_ONLY_KEY, targets);
      if (!authOnly?.allowSetupScope) throw new AppException(ErrorCodes.AUTH_SCOPE_INSUFFICIENT);
    }

    req.auth = { userId: token.userId, sessionId: token.sessionId, scope: token.scope };
    return true;
  }
}
