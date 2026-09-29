import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Cifrado simétrico con la clave maestra (envelope encryption / secretos en reposo). */
export interface SecretCipherPort {
  /** Devuelve un texto autocontenido `v1.<iv>.<tag>.<cifrado>` (base64url). */
  encrypt(plain: Buffer | string): string;
  decrypt(payload: string): Buffer;
}
export const SECRET_CIPHER = Symbol('SECRET_CIPHER');

export interface PasswordHasherPort {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

/** Firma HMAC para constancias verificables. */
export interface SignerPort {
  sign(payload: string): string;
  verify(payload: string, signature: string): boolean;
}
export const SIGNER = Symbol('SIGNER');

// ── Utilidades puras ───────────────────────────────────────────────────────
export const sha256Hex = (input: string | Buffer): string => createHash('sha256').update(input).digest('hex');

/** Token opaco aleatorio (base64url) de `bytes` bytes de entropía. */
export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

// ── Adaptadores ────────────────────────────────────────────────────────────
export class AesGcmSecretCipher implements SecretCipherPort {
  private readonly key: Buffer;

  constructor(masterKeyBase64: string) {
    this.key = Buffer.from(masterKeyBase64, 'base64');
    if (this.key.length !== 32) throw new Error('MASTER_KEY debe tener 32 bytes');
  }

  encrypt(plain: Buffer | string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(typeof plain === 'string' ? Buffer.from(plain, 'utf8') : plain), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64url'), tag.toString('base64url'), data.toString('base64url')].join('.');
  }

  decrypt(payload: string): Buffer {
    const [version, iv, tag, data] = payload.split('.');
    if (version !== 'v1' || !iv || !tag || !data) throw new Error('Formato de secreto cifrado inválido');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]);
  }
}

export class HmacSigner implements SignerPort {
  constructor(private readonly secret: string) {}

  sign(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('hex');
  }

  verify(payload: string, signature: string): boolean {
    const expected = Buffer.from(this.sign(payload), 'hex');
    const given = Buffer.from(signature, 'hex');
    return expected.length === given.length && timingSafeEqual(expected, given);
  }
}
