import { Inject, Injectable } from '@nestjs/common';
import { IdentityProvisioningPort } from '../../../shared/contracts/identity.contracts';
import { PASSWORD_HASHER, PasswordHasherPort } from '../../../shared/crypto/crypto.ports';
import { Tx } from '../../../shared/database/tx';
import { assertPasswordAcceptable } from '../domain/password-policy';
import { USER_REPOSITORY, UserRepositoryPort } from '../domain/ports/user.repository.port';
import { normalizeEmail } from '../domain/user';

@Injectable()
export class IdentityProvisioningService implements IdentityProvisioningPort {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
  ) {}

  async provisionUser(input: { email: string; password: string }, tx?: Tx): Promise<{ userId: string; created: boolean }> {
    const email = normalizeEmail(input.email);
    assertPasswordAcceptable(input.password, email);

    const existing = await this.users.findByEmail(email);
    if (existing) return { userId: existing.id, created: false }; // nunca se toca la contraseña de una cuenta existente

    const created = await this.users.create({ email, passwordHash: await this.hasher.hash(input.password) }, tx);
    if (created) return { userId: created.id, created: true };

    // Otra solicitud creó la cuenta en paralelo: se reutiliza.
    const raced = await this.users.findByEmail(email);
    if (!raced) throw new Error('No se pudo aprovisionar la cuenta');
    return { userId: raced.id, created: false };
  }
}
