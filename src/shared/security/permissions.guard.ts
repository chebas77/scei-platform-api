import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { AUDIT_RECORDER, AuditRecorderPort } from '../audit/audit-recorder.port';
import { MEMBERSHIP_DIRECTORY, MembershipDirectoryPort } from '../contracts/rbac.contracts';
import { TENANT_DIRECTORY, TenantDirectoryPort } from '../contracts/tenant.contracts';
import { AppException } from '../errors/app.exception';
import { ErrorCodes } from '../errors/error-codes';
import { PERMISSION_RESOLVER, PermissionResolverPort } from './auth-context';
import { API_MODULE_KEY, ApiModuleMeta, AUTH_ONLY_KEY, IS_PUBLIC_KEY, REQUIRE_PERMISSION_KEY, RequirePermissionMeta, TENANT_HEADER } from './decorators';

/**
 * Guard global #2: autorización RBAC con denegación por defecto (OWASP A01/API5).
 *  - `@Public` y `@AuthenticatedOnly` pasan sin permiso.
 *  - Con `@RequirePermission` se exige el permiso en los roles del usuario.
 *  - Una ruta sin ninguna de las tres declaraciones se deniega: no puede quedar abierta por descuido.
 *  - En controladores de ámbito colegio (`@ApiModule({ scope: 'tenant' })`) exige además el header
 *    `X-Tenant-Slug` y verifica, con DOS chequeos independientes, que el usuario pertenece a ese colegio:
 *    (1) tiene una membresía activa ahí, y (2) sus permisos efectivos EN ESE colegio incluyen el requerido.
 *    Las rutas de plataforma no cambian: siguen evaluándose en tenantId=null, como siempre.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(PERMISSION_RESOLVER) private readonly resolver: PermissionResolverPort,
    @Inject(MEMBERSHIP_DIRECTORY) private readonly memberships: MembershipDirectoryPort,
    @Inject(TENANT_DIRECTORY) private readonly tenants: TenantDirectoryPort,
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

    const moduleMeta = this.reflector.getAllAndOverride<ApiModuleMeta | undefined>(API_MODULE_KEY, targets);
    const tenantId = moduleMeta?.scope === 'tenant' ? await this.resolveTenant(req, userId) : null;

    const granted = await this.resolver.resolve(userId, tenantId);
    if (!granted.has(required.code)) {
      await this.deny(req, 'missing-permission', required.code);
      throw new AppException(ErrorCodes.RBAC_FORBIDDEN);
    }
    return true;
  }

  /** Resuelve y verifica el colegio de la solicitud. Nunca revela si un slug existe: toda falla es RBAC_FORBIDDEN salvo el header ausente. */
  private async resolveTenant(req: FastifyRequest, userId: string): Promise<string> {
    const slug = req.headers[TENANT_HEADER];
    if (typeof slug !== 'string' || !slug) {
      await this.deny(req, 'missing-tenant-header', undefined);
      throw new AppException(ErrorCodes.TEN_CONTEXT_REQUIRED);
    }
    const tenant = await this.tenants.findBySlug(slug);
    if (!tenant || tenant.status !== 'active') {
      await this.deny(req, 'unknown-or-inactive-tenant', undefined);
      throw new AppException(ErrorCodes.RBAC_FORBIDDEN);
    }
    // Chequeo independiente de la resolución de permisos: aunque el cálculo de permisos tuviera un bug,
    // esto por sí solo ya exige una fila de membresía activa real para ESE usuario en ESE colegio.
    if (!(await this.memberships.hasActiveMembership(userId, tenant.id))) {
      await this.deny(req, 'not-a-member', undefined);
      throw new AppException(ErrorCodes.RBAC_FORBIDDEN);
    }
    req.tenant = { id: tenant.id, slug: tenant.slug };
    return tenant.id;
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
