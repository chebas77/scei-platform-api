import { Tx } from '../../../../shared/database/tx';

/**
 * Cada módulo que guarde datos de un colegio (alumnos, asistencia, plantillas faciales...) registra
 * un purgador. La baja los ejecuta todos dentro de la misma transacción y deja el conteo en la constancia.
 */
export interface TenantDataPurger {
  /** Nombre estable que aparece en la constancia, p. ej. `students`. */
  readonly name: string;
  purge(tenantId: string, tx: Tx): Promise<{ deleted: number }>;
}
