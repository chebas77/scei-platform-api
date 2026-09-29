import { authenticator } from 'otplib';
import { TotpPort } from '../../domain/ports/totp.port';

const STEP_SECONDS = 30;
const ISSUER = 'SCEI Plataforma';

/** TOTP (RFC 6238): 6 dígitos, 30 s, tolerancia de ±1 intervalo por desfase de reloj. */
export class OtplibTotp implements TotpPort {
  private readonly totp = authenticator.clone({ step: STEP_SECONDS, digits: 6, window: 1 });

  generateSecret(): string {
    return this.totp.generateSecret(20); // 160 bits
  }

  keyUri(accountEmail: string, secret: string): string {
    return this.totp.keyuri(accountEmail, ISSUER, secret);
  }

  checkDelta(code: string, secret: string): number | null {
    try {
      return this.totp.checkDelta(code, secret);
    } catch {
      return null;
    }
  }

  currentStep(now: Date): number {
    return Math.floor(now.getTime() / 1000 / STEP_SECONDS);
  }
}
