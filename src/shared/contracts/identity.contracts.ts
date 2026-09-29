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
