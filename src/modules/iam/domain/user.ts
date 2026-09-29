export type UserStatus = 'active' | 'disabled';

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string | null;
  status: UserStatus;
  failedLoginAttempts: number;
  lockoutCount: number;
  lockedUntil: Date | null;
  mfaEnabled: boolean;
  mfaSecretEnc: string | null;
  mfaPendingSecretEnc: string | null;
  mfaLastStep: number | null;
  tokenVersion: number;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface LockoutPolicy {
  maxAttempts: number;
  baseLockMinutes: number;
}

const MAX_LOCK_MINUTES = 24 * 60;

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Usuario del dominio: encapsula bloqueo progresivo, MFA y versión de token. */
export class User {
  private constructor(private readonly p: UserProps) {}

  static rehydrate(props: UserProps): User {
    return new User({ ...props });
  }

  get id(): string {
    return this.p.id;
  }
  get email(): string {
    return this.p.email;
  }
  get passwordHash(): string | null {
    return this.p.passwordHash;
  }
  get mfaEnabled(): boolean {
    return this.p.mfaEnabled;
  }
  get mfaSecretEnc(): string | null {
    return this.p.mfaSecretEnc;
  }
  get mfaPendingSecretEnc(): string | null {
    return this.p.mfaPendingSecretEnc;
  }
  get tokenVersion(): number {
    return this.p.tokenVersion;
  }
  get lockedUntil(): Date | null {
    return this.p.lockedUntil;
  }
  get isActive(): boolean {
    return this.p.status === 'active';
  }

  isLocked(now: Date): boolean {
    return this.p.lockedUntil !== null && this.p.lockedUntil > now;
  }

  /**
   * Bloqueo progresivo: al llegar a `maxAttempts` fallos se bloquea `base × 2^(bloqueos previos)` minutos
   * (tope 24 h). Así un atacante paciente cada vez espera más.
   */
  registerFailedAttempt(now: Date, policy: LockoutPolicy): void {
    this.p.failedLoginAttempts += 1;
    if (this.p.failedLoginAttempts >= policy.maxAttempts) {
      const minutes = Math.min(policy.baseLockMinutes * 2 ** this.p.lockoutCount, MAX_LOCK_MINUTES);
      this.p.lockoutCount += 1;
      this.p.failedLoginAttempts = 0;
      this.p.lockedUntil = new Date(now.getTime() + minutes * 60_000);
    }
  }

  registerSuccessfulLogin(now: Date): void {
    this.p.failedLoginAttempts = 0;
    this.p.lockoutCount = 0;
    this.p.lockedUntil = null;
    this.p.lastLoginAt = now;
  }

  /** Acepta un intervalo TOTP solo si es posterior al último usado (anti-replay). */
  acceptMfaStep(step: number): boolean {
    if (this.p.mfaLastStep !== null && step <= this.p.mfaLastStep) return false;
    this.p.mfaLastStep = step;
    return true;
  }

  startMfaEnrollment(encryptedSecret: string): void {
    this.p.mfaPendingSecretEnc = encryptedSecret;
  }

  /** Activa MFA con el secreto pendiente e invalida los tokens anteriores (incluido el de configuración). */
  confirmMfaEnrollment(step: number): void {
    this.p.mfaSecretEnc = this.p.mfaPendingSecretEnc;
    this.p.mfaPendingSecretEnc = null;
    this.p.mfaEnabled = true;
    this.p.mfaLastStep = step;
    this.p.tokenVersion += 1;
  }

  toProps(): UserProps {
    return { ...this.p };
  }
}
