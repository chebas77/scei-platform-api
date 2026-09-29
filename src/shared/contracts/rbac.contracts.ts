import { Tx } from '../database/tx';

/** Búsqueda de roles del sistema por código (lo implementa RBAC). */
export interface RoleDirectoryPort {
  findSystemRole(code: string): Promise<{ id: string; scope: 'platform' | 'tenant' } | null>;
}
export const ROLE_DIRECTORY = Symbol('ROLE_DIRECTORY');

/** Asignación de un rol a un usuario en un ámbito (lo implementa RBAC). */
export interface RoleAssignmentPort {
  /** `tenantId = null` asigna un rol de plataforma. Idempotente. */
  assign(input: { userId: string; roleId: string; tenantId: string | null }, tx?: Tx): Promise<void>;
}
export const ROLE_ASSIGNMENT = Symbol('ROLE_ASSIGNMENT');

/** Política de MFA derivada de los roles del usuario (la implementa RBAC, la consume IAM). */
export interface MfaPolicyPort {
  isMfaRequired(userId: string): Promise<boolean>;
}
export const MFA_POLICY = Symbol('MFA_POLICY');

/** Retira todos los accesos de un colegio (baja definitiva). Lo implementa RBAC, lo consume Tenants. */
export interface TenantAccessRevokerPort {
  revokeAllForTenant(tenantId: string, tx?: Tx): Promise<number>;
}
export const TENANT_ACCESS_REVOKER = Symbol('TENANT_ACCESS_REVOKER');
