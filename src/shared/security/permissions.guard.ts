import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { AUDIT_RECORDER, AuditRecorderPort } from '../audit/audit-recorder.port';
import { AppException } from '../errors/app.exception';
import { ErrorCodes } from '../errors/error-codes';
import { PERMISSION_RESOLVER, PermissionResolverPort } from './auth-context';
import { AUTH_ONLY_KEY, IS_PUBLIC_KEY, REQUIRE_PERMISSION_KEY, RequirePermissionMeta } from './decorators';

/**
 * Guard global #2: autorización RBAC con denegación por defecto (OWASP A01/API5).
 *  - `@Public` y `@AuthenticatedOnly` pasan sin permiso.
 *  - Con `@RequirePermission` se exige el permiso en los roles del usuario.
 *  - Una ruta sin ninguna de las tres declaraciones se deniega: no puede quedar abierta por descuido.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(PERMISSION_RESOLVER) private readonly resolver: PermissionResolverPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;
    if (this.reflector.getAllAndOverride(AUTH_ONLY_KEY, targets)) return true;

    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const required = this.reflector.getAllAndOverride<RequirePermissionMeta | undefined>(REQUIRE_PERMISSION_KEY, targets);
    if (!required) {
      await this.deny(req, 'undeclared', undefined);
      throw new AppException(ErrorCodes.RBAC_ENDPOINT_UNDECLARED);
    }

    const userId = req.auth?.userId;
    if (!userId) throw new AppException(ErrorCodes.AUTH_TOKEN_INVALID);

    // Las rutas de plataforma se evalúan en el ámbito global (tenantId null).
    const granted = await this.resolver.resolve(userId, null);
    if (!granted.has(required.code)) {
      await this.deny(req, 'missing-permission', required.code);
      throw new AppException(ErrorCodes.RBAC_FORBIDDEN);
    }
    return true;
  }

  private async deny(req: FastifyRequest, reason: string, permission: string | undefined): Promise<void> {
    // Registro de mejor esfuerzo: si la auditoría falla, la respuesta sigue siendo 403 (no 500).
    await this.audit.record({
      action: 'access.denied',
      outcome: 'denied',
      actorUserId: req.auth?.userId ?? null,
      resourceType: 'endpoint',
      resourceId: `${req.method} ${req.routeOptions?.url ?? req.url.split('?')[0]}`,
      meta: { ip: req.ip, userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300), requestId: String(req.id ?? '') },
      metadata: { reason, ...(permission ? { permission } : {}) },
    }).catch(() => undefined);
  }
}
