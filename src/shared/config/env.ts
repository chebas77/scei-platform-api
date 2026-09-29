import { z } from 'zod';

/** Clave maestra AES-256: 32 bytes en base64. */
const base64Key32 = z
  .string()
  .refine((v) => Buffer.from(v, 'base64').length === 32, 'debe ser una clave de 32 bytes en base64');

const bool = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true');

/**
 * Validación de variables de entorno al arrancar (falla rápido).
 * Los secretos NO tienen valor por defecto: si faltan, la app no inicia (OWASP A02/A05).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(200).default(10),

  JWT_ACCESS_SECRET: z.string().min(32, 'mínimo 32 caracteres'),
  JWT_ISSUER: z.string().min(1).default('scei-platform'),
  JWT_AUDIENCE: z.string().min(1).default('scei-api'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(60).default(7),
  MFA_CHALLENGE_TTL_SECONDS: z.coerce.number().int().min(60).max(600).default(300),

  /** Clave maestra que envuelve las claves de cada tenant y cifra secretos TOTP. */
  MASTER_KEY: base64Key32,
  /** Clave HMAC para firmar constancias de borrado. Distinta de MASTER_KEY. */
  SIGNING_KEY: z.string().min(32, 'mínimo 32 caracteres'),

  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  INVITATION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(72),
  TENANT_PURGE_GRACE_DAYS: z.coerce.number().int().min(0).max(365).default(7),

  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  TRUST_PROXY: bool.default('false'),
  SWAGGER_ENABLED: bool.optional(),
  /** Base pública del frontend para armar el enlace de invitación. */
  APP_PUBLIC_URL: z.string().url().default('http://localhost:3001'),

  /** SMTP para invitaciones por correo. Si falta SMTP_HOST, se usa el adaptador de consola (dev/test). */
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: bool.default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

export type AppConfig = Omit<z.infer<typeof envSchema>, 'SWAGGER_ENABLED'> & { SWAGGER_ENABLED: boolean };

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Configuración de entorno inválida:\n${issues}`);
  }
  const cfg = parsed.data;
  return {
    ...cfg,
    // Swagger: activo por defecto solo fuera de producción.
    SWAGGER_ENABLED: cfg.SWAGGER_ENABLED ?? cfg.NODE_ENV !== 'production',
  };
}

export const APP_CONFIG = Symbol('APP_CONFIG');
