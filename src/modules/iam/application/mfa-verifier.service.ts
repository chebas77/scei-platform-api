import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '../../../shared/clock/clock.port';
import { SECRET_CIPHER, SecretCipherPort } from '../../../shared/crypto/crypto.ports';
import { TOTP, TotpPort } from '../domain/ports/totp.port';

@Injectable()
export class MfaVerifier {
  constructor(
    @Inject(TOTP) private readonly totp: TotpPort,
    @Inject(SECRET_CIPHER) private readonly cipher: SecretCipherPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  /** Devuelve el intervalo TOTP aceptado, o `null` si el código no corresponde al secreto. */
  check(encryptedSecret: string, code: string): number | null {
    const secret = this.cipher.decrypt(encryptedSecret).toString('utf8');
    const delta = this.totp.checkDelta(code, secret);
    return delta === null ? null : this.totp.currentStep(this.clock.now()) + delta;
  }
}
