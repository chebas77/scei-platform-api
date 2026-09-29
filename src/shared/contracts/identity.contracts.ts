import { Tx } from '../database/tx';

/** Alta de cuentas de usuario (la implementa IAM, la consumen Tenants y la CLI). */
export interface IdentityProvisioningPort {
  /**
   * Crea la cuenta si el correo no existe. Si ya existe NO cambia su contraseña
   * (el dueño del correo solo gana una membresía nueva).
   * Lanza AUTH-011 si la contraseña no cumple la política.
   */
  provisionUser(input: { email: string; password: string }, tx?: Tx): Promise<{ userId: string; created: boolean }>;
}
export const IDENTITY_PROVISIONING = Symbol('IDENTITY_PROVISIONING');

export interface UserDirectoryEntry {
  id: string;
  email: string;
  status: 'active' | 'disabled';
  mfaEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

/** Lectura y estado de cuentas para pantallas de administración (la implementa IAM, la consume Users). */
export interface UserDirectoryPort {
  listByIds(ids: string[]): Promise<UserDirectoryEntry[]>;
  /** Habilita/deshabilita la cuenta. Deshabilitar invalida sus sesiones activas. */
  setStatus(id: string, status: 'active' | 'disabled'): Promise<void>;
}
export const USER_DIRECTORY = Symbol('USER_DIRECTORY');
