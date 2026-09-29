import { applyDecorators, createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { AuthContext, TenantAuthContext } from './auth-context';
import { RequestMeta } from '../audit/audit-recorder.port';

/** Header obligatorio en toda ruta de ámbito colegio; declara para cuál colegio actúa la solicitud. */
export const TENANT_HEADER = 'x-tenant-slug';

export const IS_PUBLIC_KEY = 'scei:public';
export const AUTH_ONLY_KEY = 'scei:auth-only';
export const API_MODULE_KEY = 'scei:api-module';
export const REQUIRE_PERMISSION_KEY = 'scei:require-permission';

export interface ApiModuleMeta {
  /** Clave estable del módulo (p. ej. `tenants`). Es el prefijo de sus permisos. */
  key: string;
  /** Nombre visible en la administración de roles y en Swagger. */
  name: string;
  description?: string;
  /** Ámbito donde se pueden asignar sus permisos. */
  scope: 'platform' | 'tenant';
}

export interface RequirePermissionMeta {
  /** `<módulo>:<acción>`, p. ej. `tenants:create`. */
  code: string;
  description: string;
}

/** Ruta sin autenticación (login, health...). Es la única forma de dejar una ruta abierta. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Ruta que solo exige sesión válida, sin permiso específico (p. ej. `GET /auth/me`). */
export const AuthenticatedOnly = (opts: { allowSetupScope?: boolean } = {}) =>
  applyDecorators(SetMetadata(AUTH_ONLY_KEY, { allowSetupScope: opts.allowSetupScope ?? false }), ApiBearerAuth());

/** Declara a qué módulo funcional pertenece el controlador; alimenta el catálogo de RBAC. */
export const ApiModule = (meta: ApiModuleMeta) =>
  applyDecorators(SetMetadata(API_MODULE_KEY, meta), ApiTags(meta.name));

/** Declara el permiso que protege este endpoint. Sin él (ni @Public/@AuthenticatedOnly) se deniega. */
export const RequirePermission = (code: string, description: string) =>
  applyDecorators(SetMetadata(REQUIRE_PERMISSION_KEY, { code, description } satisfies RequirePermissionMeta), ApiBearerAuth());

export const CurrentAuth = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthContext => {
  const req = ctx.switchToHttp().getRequest<FastifyRequest>();
  if (!req.auth) throw new Error('CurrentAuth usado en una ruta sin autenticación');
  return req.auth;
});

/** Colegio ya verificado por `PermissionsGuard` (header `X-Tenant-Slug` + membresía activa). Solo válido en controladores con `scope: 'tenant'`. */
export const CurrentTenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): TenantAuthContext => {
  const req = ctx.switchToHttp().getRequest<FastifyRequest>();
  if (!req.tenant) throw new Error('CurrentTenant usado en una ruta sin ámbito de colegio');
  return req.tenant;
});

export const ReqMeta = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestMeta => {
  const req = ctx.switchToHttp().getRequest<FastifyRequest>();
  return { ip: req.ip, userAgent: (req.headers['user-agent'] ?? '').slice(0, 300), requestId: String(req.id ?? '') };
});
