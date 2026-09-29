import { Tx } from '../../../../shared/database/tx';

/** Custodia de la clave de datos (DEK) de cada colegio. Destruirla = borrado criptográfico. */
export interface TenantKeyStorePort {
  /** Genera y guarda una DEK nueva envuelta con la clave maestra. */
  provision(tenantId: string, tx?: Tx): Promise<{ keyVersion: number }>;
  /** Entrega la DEK en claro (solo para servicios que cifran datos del colegio). `null` si fue destruida. */
  unwrap(tenantId: string): Promise<Buffer | null>;
  /** Irreversible. Devuelve la versión destruida o `null` si no había clave. */
  destroy(tenantId: string, now: Date, tx?: Tx): Promise<{ keyVersion: number } | null>;
}
export const TENANT_KEY_STORE = Symbol('TENANT_KEY_STORE');
