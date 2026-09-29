import { Tx } from '../../../../shared/database/tx';

export interface AccessRepositoryPort {
  /** Permisos efectivos del usuario. `tenantId = null` = ámbito de plataforma. */
  effectivePermissionCodes(userId: string, tenantId: string | null): Promise<string[]>;
  /** ¿Alguno de los roles activos del usuario exige MFA? */
  anyRoleRequiresMfa(userId: string): Promise<boolean>;
  findSystemRole(code: string): Promise<{ id: string; scope: 'platform' | 'tenant' } | null>;
  findRoleScope(roleId: string): Promise<'platform' | 'tenant' | null>;
  /** Elimina las membresías del colegio; devuelve cuántas. */
  revokeAllForTenant(tenantId: string, tx?: Tx): Promise<number>;
  assign(input: { userId: string; roleId: string; tenantId: string | null }, tx?: Tx): Promise<void>;
}
export const ACCESS_REPOSITORY = Symbol('ACCESS_REPOSITORY');
