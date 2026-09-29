export interface TotpPort {
  generateSecret(): string;
  /** URL `otpauth://` que las apps autenticadoras convierten en QR. */
  keyUri(accountEmail: string, secret: string): string;
  /** Devuelve el desfase en intervalos (-1, 0, 1) si el código es válido; `null` si no. */
  checkDelta(code: string, secret: string): number | null;
  /** Intervalo TOTP actual (30 s). */
  currentStep(now: Date): number;
}
export const TOTP = Symbol('TOTP');
