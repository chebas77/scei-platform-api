import { Tx } from '../../../../shared/database/tx';
import { Kiosk, KioskStatus, NewKiosk } from '../kiosk';

export interface KioskRepositoryPort {
  /** `null` si ya existe un kiosco con ese código en el colegio (carrera segura). */
  create(input: NewKiosk, tx?: Tx): Promise<Kiosk | null>;
  findById(id: string): Promise<Kiosk | null>;
  listByTenant(tenantId: string): Promise<Kiosk[]>;
  countActiveByTenant(tenantId: string): Promise<number>;
  update(id: string, patch: Partial<Pick<Kiosk, 'name' | 'status'>>): Promise<Kiosk | null>;
  delete(id: string): Promise<boolean>;
  deleteAllForTenant(tenantId: string, tx: Tx): Promise<number>;
}
export const KIOSK_REPOSITORY = Symbol('KIOSK_REPOSITORY');
