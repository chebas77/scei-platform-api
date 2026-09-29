export type Scope = 'platform' | 'tenant';

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  scope: Scope;
  tenantId: string | null;
  isSystem: boolean;
  requiresMfa: boolean;
  createdAt: Date;
}

export interface RoleSummary extends Role {
  moduleCount: number;
  permissionCount: number;
}

export interface NewRole {
  code: string;
  name: string;
  description?: string;
  scope: Scope;
  requiresMfa: boolean;
}

export interface ModuleEntity {
  id: string;
  key: string;
  name: string;
  description: string | null;
  scope: Scope;
  isActive: boolean;
}

export interface PermissionEndpoint {
  method: string;
  path: string;
}

export interface PermissionEntity {
  id: string;
  code: string;
  moduleId: string;
  description: string;
  endpoints: PermissionEndpoint[];
  isActive: boolean;
}

export interface ModuleWithPermissions {
  module: ModuleEntity;
  permissions: PermissionEntity[];
}

/** Lo que el escáner descubre en los controladores y se vuelca al catálogo. */
export interface CatalogEntry {
  module: { key: string; name: string; description?: string; scope: Scope };
  permissions: { code: string; description: string; endpoints: PermissionEndpoint[] }[];
}

/** Estos roles no pueden perder módulos: quedarse sin ellos dejaría la plataforma sin operador. */
export const LOCKED_ROLE_CODES: readonly string[] = ['platform_superadmin'];

export const permissionModuleKey = (code: string): string => code.split(':')[0];
