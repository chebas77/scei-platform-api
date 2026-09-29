import { Tx } from '../../../../shared/database/tx';
import { MembershipInfo } from '../../../../shared/contracts/rbac.contracts';

export interface AccessRepositoryPort {
  /** Permisos efectivos del usuario. `tenantId = null` = ámbito de plataforma. */
  effectivePermissionCodes(userId: string, tenantId: string | null): Promise<string[]>;
  /** ¿Alguno de los roles activos del usuario exige MFA? */
  anyRoleRequiresMfa(userId: string): Promise<boolean>;
  findSystemRole(code: string): Promise<{ id: string; scope: 'platform' | 'tenant' } | null>;
  findRoleScope(roleId: string): Promise<'platform' | 'tenant' | null>;
  findRoleById(roleId: string): Promise<{ id: string; code: string; name: string; scope: 'platform' | 'tenant' } | null>;
  /** Elimina las membresías del colegio; devuelve cuántas. */
  revokeAllForTenant(tenantId: string, tx?: Tx): Promise<number>;
  assign(input: { userId: string; roleId: string; tenantId: string | null }, tx?: Tx): Promise<void>;
  /** Membresías activas de ese ámbito, con el rol resuelto. */
  listByScope(tenantId: string | null): Promise<MembershipInfo[]>;
  countActiveUsersWithSystemRole(code: string): Promise<number>;
  /** Dentro del ámbito, deja al usuario con exactamente ese rol (reemplaza el anterior). */
  setRole(userId: string, tenantId: string | null, roleId: string, tx?: Tx): Promise<void>;
  hasActiveMembership(userId: string, tenantId: string): Promise<boolean>;
  listForUser(userId: string): Promise<(MembershipInfo & { tenantId: string | null })[]>;
}
export const ACCESS_REPOSITORY = Symbol('ACCESS_REPOSITORY');
