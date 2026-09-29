import { Injectable } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { API_MODULE_KEY, ApiModuleMeta, REQUIRE_PERMISSION_KEY, RequirePermissionMeta } from '../../../shared/security/decorators';
import { CatalogEntry, PermissionEndpoint } from '../domain/rbac.types';

export const API_PREFIX = '/v1';

const join = (...parts: string[]): string =>
  '/' + parts.flatMap((p) => p.split('/')).filter(Boolean).join('/');

/**
 * Descubre, leyendo los controladores, qué módulos y permisos existen y a qué endpoints protege cada uno.
 * El catálogo de RBAC nace del código: no hay tablas que mantener a mano ni permisos huérfanos.
 */
@Injectable()
export class ApiCatalogScanner {
  constructor(private readonly discovery: DiscoveryService) {}

  scan(): CatalogEntry[] {
    const byModule = new Map<string, CatalogEntry>();

    for (const wrapper of this.discovery.getControllers()) {
      const metatype = wrapper.metatype;
      if (!metatype) continue;
      const moduleMeta = Reflect.getMetadata(API_MODULE_KEY, metatype) as ApiModuleMeta | undefined;
      const controllerPath = this.pathOf(Reflect.getMetadata(PATH_METADATA, metatype));
      const proto = metatype.prototype as Record<string, unknown>;

      for (const name of Object.getOwnPropertyNames(proto)) {
        const handler = proto[name];
        if (name === 'constructor' || typeof handler !== 'function') continue;
        const perm = Reflect.getMetadata(REQUIRE_PERMISSION_KEY, handler) as RequirePermissionMeta | undefined;
        if (!perm) continue;

        if (!moduleMeta) {
          throw new Error(`${metatype.name}.${name} usa @RequirePermission pero el controlador no declara @ApiModule`);
        }
        const prefix = perm.code.split(':')[0];
        if (prefix !== moduleMeta.key) {
          throw new Error(`Permiso "${perm.code}" en ${metatype.name}: su prefijo debe ser el módulo "${moduleMeta.key}"`);
        }

        let entry = byModule.get(moduleMeta.key);
        if (!entry) {
          entry = { module: { ...moduleMeta }, permissions: [] };
          byModule.set(moduleMeta.key, entry);
        } else if (entry.module.scope !== moduleMeta.scope) {
          throw new Error(`El módulo "${moduleMeta.key}" se declara con ámbitos distintos`);
        }

        const endpoint: PermissionEndpoint = {
          method: RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as number] ?? 'GET',
          path: join(API_PREFIX, controllerPath, this.pathOf(Reflect.getMetadata(PATH_METADATA, handler))),
        };
        let p = entry.permissions.find((x) => x.code === perm.code);
        if (!p) {
          p = { code: perm.code, description: perm.description, endpoints: [] };
          entry.permissions.push(p);
        }
        if (!p.endpoints.some((e) => e.method === endpoint.method && e.path === endpoint.path)) p.endpoints.push(endpoint);
      }
    }
    return [...byModule.values()].sort((a, b) => a.module.key.localeCompare(b.module.key));
  }

  private pathOf(raw: unknown): string {
    if (Array.isArray(raw)) return String(raw[0] ?? '');
    return typeof raw === 'string' ? raw : '';
  }
}
