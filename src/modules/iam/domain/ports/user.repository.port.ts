import { Tx } from '../../../../shared/database/tx';
import { User, UserStatus } from '../user';

export interface NewUser {
  email: string;
  passwordHash: string;
}

export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  listByIds(ids: string[]): Promise<User[]>;
  /** Estado mínimo para validar cada solicitud autenticada. */
  getAuthState(id: string): Promise<{ status: UserStatus; tokenVersion: number } | null>;
  /** Inserta. Devuelve `null` si el correo ya existía (carrera segura). */
  create(input: NewUser, tx?: Tx): Promise<User | null>;
  /**
   * Lee el usuario con bloqueo de fila, aplica `mutate` y guarda, todo en una transacción.
   * Evita que intentos fallidos en paralelo esquiven el bloqueo.
   */
  mutate(id: string, mutate: (user: User) => void | Promise<void>): Promise<User | null>;
}
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
