import * as argon2 from 'argon2';
import { PasswordHasherPort } from './crypto.ports';

/** Argon2id con parámetros OWASP (m=19 MiB, t=2, p=1 como mínimo; aquí un poco por encima). */
export class Argon2PasswordHasher implements PasswordHasherPort {
  private static readonly OPTIONS: Parameters<typeof argon2.hash>[1] = {
    type: argon2.argon2id,
    memoryCost: 32768, // 32 MiB
    timeCost: 3,
    parallelism: 1,
  };

  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { ...Argon2PasswordHasher.OPTIONS, raw: false });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
