import { Tx } from '../database/tx';

/** Búsqueda de roles (lo implementa RBAC). */
export interface RoleDirectoryPort {
  findSystemRole(code: string): Promise<{ id: string; scope: 'platform' | 'tenant' } | null>;
  findById(id: string): Promise<{ id: string; code: string; name: string; scope: 'platform' | 'tenant' } | null>;
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

export interface MembershipInfo {
  userId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
}

/** Consulta y edición de membresías (quién tiene qué rol en qué ámbito). Lo implementa RBAC, lo consume Users. */
export interface MembershipDirectoryPort {
  /** `tenantId = null` lista membresías de plataforma. */
  listByScope(tenantId: string | null): Promise<MembershipInfo[]>;
  /** Cuántos usuarios activos tienen ese rol de sistema (para no dejar la plataforma sin operador). */
  countActiveUsersWithSystemRole(code: string): Promise<number>;
  /** Reemplaza el rol del usuario en ese ámbito (deja como máximo un rol por usuario y ámbito). */
  setRole(userId: string, tenantId: string | null, roleId: string, tx?: Tx): Promise<void>;
  /** Verificación explícita (independiente de los permisos efectivos) de que el usuario pertenece a ese colegio. */
  hasActiveMembership(userId: string, tenantId: string): Promise<boolean>;
  /** Todas las membresías activas del usuario (plataforma y cualquier colegio) — para saber a dónde llevarlo tras el login. */
  listForUser(userId: string): Promise<(MembershipInfo & { tenantId: string | null })[]>;
}
export const MEMBERSHIP_DIRECTORY = Symbol('MEMBERSHIP_DIRECTORY');
